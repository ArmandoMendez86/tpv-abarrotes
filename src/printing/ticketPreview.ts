import type { TicketSettings } from '../database/settingsRepo';

export function buildTestTicketText(settings: TicketSettings): string {
  const lines: string[] = [];
  const now = new Date();
  const date = now.toLocaleString('es-MX');

  const name = settings.storeName.trim() || 'TU ABARROTERÍA';
  const address = settings.storeAddress.trim();
  const phone = settings.storePhone.trim();
  const bye = settings.farewellMessage.trim() || '¡Gracias por su compra!';

  lines.push(center(name));
  if (address) lines.push(center(address));
  if (phone) lines.push(center(`Tel: ${phone}`));
  lines.push('--------------------------------');
  lines.push(`PRUEBA DE TICKET`);
  lines.push(date);
  lines.push('--------------------------------');
  lines.push('1 x Producto de prueba      $10.00');
  lines.push('2 x Otro producto           $30.00');
  lines.push('--------------------------------');
  lines.push(`TOTAL:                      $40.00`);
  lines.push('PAGO: EFECTIVO              $50.00');
  lines.push('CAMBIO:                     $10.00');
  lines.push('--------------------------------');
  lines.push(center(bye));
  lines.push('');
  lines.push('');
  return lines.join('\n');
}

function center(text: string, width: number = 32): string {
  const t = text.trim();
  if (t.length >= width) return t;
  const left = Math.floor((width - t.length) / 2);
  return ' '.repeat(left) + t;
}

