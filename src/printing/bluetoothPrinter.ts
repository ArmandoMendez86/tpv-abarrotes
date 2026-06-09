import { PermissionsAndroid, Platform } from 'react-native';
import RNBluetoothClassic, {
  type BluetoothDevice,
} from 'react-native-bluetooth-classic';
import type { TicketSettings } from '../database/settingsRepo';
import type { CartLine } from '../cart/useCart';
import { formatCurrency } from '../utils/format';

// ─── Tipos públicos ────────────────────────────────────────────────────────

export type BtDevice = {
  name: string;
  address: string;
};

export type PrintSaleInput = {
  saleId: number;
  lines: CartLine[];
  total: number;
  cashReceived: number | null;
  changeGiven: number | null;
  settings: TicketSettings;
};

// ─── Estado del módulo ─────────────────────────────────────────────────────

let _device: BluetoothDevice | null = null;

// ─── Permisos ──────────────────────────────────────────────────────────────

export async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const api = Number(Platform.Version);
    if (api >= 31) {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
      return (
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === 'granted' &&
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === 'granted'
      );
    }
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return result === 'granted';
  } catch {
    return false;
  }
}

// ─── Estado Bluetooth ──────────────────────────────────────────────────────

export async function checkBluetoothEnabled(): Promise<boolean> {
  try {
    return await RNBluetoothClassic.isBluetoothEnabled();
  } catch {
    return false;
  }
}

export async function enableBluetooth(): Promise<void> {
  await RNBluetoothClassic.requestBluetoothEnabled();
}

// ─── Descubrimiento de dispositivos ───────────────────────────────────────

export async function scanDevices(): Promise<{
  paired: BtDevice[];
  found: BtDevice[];
}> {
  const toDevice = (d: BluetoothDevice): BtDevice => ({
    name: d.name?.trim() || d.address,
    address: d.address,
  });

  // Dispositivos ya emparejados — respuesta inmediata
  const bonded = await RNBluetoothClassic.getBondedDevices();
  const paired = bonded.map(toDevice);

  // Escaneo activo — puede tardar varios segundos
  let found: BtDevice[] = [];
  try {
    const discovered = await RNBluetoothClassic.startDiscovery();
    found = discovered
      .map(toDevice)
      .filter(d => !paired.some(p => p.address === d.address));
  } catch {
    // Algunos dispositivos no soportan discovery; devolver solo los emparejados
  }

  return { paired, found };
}

// ─── Conexión ──────────────────────────────────────────────────────────────

export async function connectPrinter(address: string): Promise<void> {
  // Reutilizar conexión activa si es al mismo dispositivo
  if (_device?.address === address) {
    const stillAlive = await _device.isConnected().catch(() => false);
    if (stillAlive) return;
  }
  _device = await RNBluetoothClassic.connectToDevice(address);
}

export async function disconnectPrinter(): Promise<void> {
  if (_device) {
    await _device.disconnect().catch(() => {});
    _device = null;
  }
}

// ─── ESC/POS directo ──────────────────────────────────────────────────────
//
// Protocolo ESC/POS estándar para impresoras térmicas de 58 mm (32 chars/línea).
// No depende de ninguna librería externa: se envían bytes crudos al socket BT.

const ESC = '\x1B';
const GS = '\x1D';
const LF = '\n';

const Esc = {
  // ESC @ = reset; ESC t 16 = select WPC1252 (matches latin1 byte values: á=0xE1, ñ=0xF1, etc.)
  INIT: ESC + '@' + ESC + '\x74\x10',
  ALIGN_L: ESC + 'a\x00',
  ALIGN_C: ESC + 'a\x01',
  BOLD_ON: ESC + 'E\x01',
  BOLD_OFF: ESC + 'E\x00',
  /** Doble ancho + doble alto */
  SIZE_2X: ESC + '!\x30',
  SIZE_1X: ESC + '!\x00',
  /** Avanzar n líneas en blanco */
  FEED: (n: number) => ESC + 'd' + String.fromCharCode(n),
  /** Corte parcial */
  CUT: GS + 'V\x41\x00',
};

const LINE = '--------------------------------';
const COL = 32; // chars por línea en papel 58 mm

/** Rellena con espacios a la derecha hasta `width`. */
function padL(text: string, width: number): string {
  const t = text.slice(0, width);
  return t + ' '.repeat(width - t.length);
}

/** Rellena con espacios a la izquierda hasta `width`. */
function padR(text: string, width: number): string {
  const t = text.slice(-width);
  return ' '.repeat(width - t.length) + t;
}

/** Centra el texto en `width` caracteres. */
function center(text: string, width: number = COL): string {
  const t = text.slice(0, width);
  const pad = Math.floor((width - t.length) / 2);
  return ' '.repeat(pad) + t;
}

async function send(text: string): Promise<void> {
  if (!_device) throw new Error('Sin impresora conectada.');
  // latin1 para que los bytes ESC/POS pasen sin modificarse
  await _device.write(text, 'latin1');
}

// ─── Secciones reutilizables ───────────────────────────────────────────────

async function printHeader(s: TicketSettings): Promise<void> {
  const name = s.storeName.trim() || 'MI ABARROTERÍA';
  // ALIGN_C queda activo: dirección y teléfono los centra el hardware, sin padding manual.
  await send(Esc.INIT + Esc.ALIGN_C);
  await send(Esc.SIZE_2X + Esc.BOLD_ON + name + LF + Esc.SIZE_1X + Esc.BOLD_OFF);
  if (s.storeAddress.trim()) await send(s.storeAddress.trim() + LF);
  if (s.storePhone.trim()) await send('Tel: ' + s.storePhone.trim() + LF);
  await send(Esc.ALIGN_L + LINE + LF);
}

async function printFooter(farewell: string): Promise<void> {
  await send(LINE + LF);
  await send(Esc.ALIGN_C + (farewell || '¡Gracias por su compra!') + LF);
  await send(Esc.FEED(3) + Esc.CUT);
}

// ─── API pública de impresión ──────────────────────────────────────────────

/**
 * Imprime el ticket de una venta.
 * Llama a connectPrinter() antes de invocar esta función.
 */
export async function printSaleTicket(input: PrintSaleInput): Promise<void> {
  const { saleId, lines, total, cashReceived, changeGiven, settings } = input;

  await printHeader(settings);

  const now = new Date().toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  await send(`Ticket #${saleId}` + LF + now + LF + LINE + LF);

  // Artículos: columna nombre (18) + subtotal (14) = 32
  for (const line of lines) {
    await send(padL(line.name, 18) + padR(formatCurrency(line.unitPrice * line.quantity), 14) + LF);
    if (line.quantity > 1) {
      await send(`  ${line.quantity} x ${formatCurrency(line.unitPrice)}` + LF);
    }
  }

  await send(LINE + LF);

  // Total en negrita
  const totalRow = padL('TOTAL:', 16) + padR(formatCurrency(total), 16);
  await send(Esc.BOLD_ON + totalRow + Esc.BOLD_OFF + LF);

  if (cashReceived != null) {
    await send(padL('EFECTIVO:', 16) + padR(formatCurrency(cashReceived), 16) + LF);
  }
  if (changeGiven != null && changeGiven > 0) {
    await send(padL('CAMBIO:', 16) + padR(formatCurrency(changeGiven), 16) + LF);
  }

  await printFooter(settings.farewellMessage.trim());
}

/**
 * Imprime un ticket de prueba para verificar la conexión.
 * Llama a connectPrinter() antes de invocar esta función.
 */
export async function printTestTicketBt(settings: TicketSettings): Promise<void> {
  await printHeader(settings);

  const now = new Date().toLocaleString('es-MX');
  await send(Esc.BOLD_ON + 'PRUEBA DE IMPRESORA' + Esc.BOLD_OFF + LF);
  await send(now + LF + LINE + LF);
  await send(padL('Producto de prueba', 18) + padR('$10.00', 14) + LF);
  await send(padL('2 x Otro producto', 18) + padR('$30.00', 14) + LF);
  await send(LINE + LF);
  await send(Esc.BOLD_ON + padL('TOTAL:', 16) + padR('$40.00', 16) + Esc.BOLD_OFF + LF);

  await printFooter(settings.farewellMessage.trim());
}
