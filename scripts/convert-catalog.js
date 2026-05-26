/* eslint-disable no-console */
/**
 * Convierte el CSV de catálogo en un JSON estático que se empaqueta con la app.
 * Uso: node scripts/convert-catalog.js "<ruta-al-csv>"
 *
 * Decisiones tomadas tras inspeccionar el CSV de origen:
 *  - Encabezados: "Código,Nombre,SubCategoría,Costo,Precio".
 *  - Costos/Precios vienen con prefijo "$" y "." como separador decimal
 *    (ej. "$8.000" = 8.0; "$6.083" = 6.083). Se almacenan como número.
 *  - Filas con código vacío o duplicado se descartan/colapsan (la primera gana).
 *  - El BOM UTF-8 inicial se elimina si está presente.
 */
const fs = require('fs');
const path = require('path');

function parseMoney(raw) {
  if (raw == null) {
    return 0;
  }
  const cleaned = String(raw).replace(/[$\s]/g, '').replace(',', '.');
  if (cleaned === '' || cleaned === '-') {
    return 0;
  }
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : 0;
}

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Falta ruta del CSV.');
    process.exit(1);
  }

  const raw = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length === 0) {
    console.error('CSV vacío.');
    process.exit(1);
  }

  const header = splitCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  const idxBarcode = header.findIndex(h => h.startsWith('c') && h.includes('digo'));
  const idxName = header.findIndex(h => h === 'nombre');
  const idxCategory = header.findIndex(h => h.includes('categor'));
  const idxCost = header.findIndex(h => h === 'costo');
  const idxPrice = header.findIndex(h => h === 'precio');

  const seen = new Set();
  const products = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const barcode = (cols[idxBarcode] || '').trim();
    const name = (cols[idxName] || '').trim();
    if (!name) {
      skipped++;
      continue;
    }
    const key = barcode || `__noBarcode__${i}`;
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);
    products.push({
      barcode: barcode || null,
      name,
      category: (cols[idxCategory] || '').trim() || null,
      cost: parseMoney(cols[idxCost]),
      price: parseMoney(cols[idxPrice]),
    });
  }

  const outDir = path.join(__dirname, '..', 'src', 'database', 'seed');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'products.json');
  fs.writeFileSync(outPath, JSON.stringify(products));

  console.log(`Generado ${outPath}`);
  console.log(`Productos: ${products.length} (omitidos ${skipped})`);
}

main();
