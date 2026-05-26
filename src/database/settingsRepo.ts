import { getDb } from './database';

export type PrinterMode = 'none' | 'bluetooth' | 'network';

export type TicketSettings = {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  farewellMessage: string;
  printerMode: PrinterMode;
  btDeviceName: string | null;
  btDeviceId: string | null;
  netHost: string | null;
  netPort: number | null;
  updatedAt: string;
};

export function getTicketSettings(): TicketSettings {
  const res = getDb().execute(
    `SELECT store_name, store_address, store_phone, farewell_message,
            printer_mode, bt_device_name, bt_device_id, net_host, net_port,
            updated_at
       FROM ticket_settings
      WHERE id = 1
      LIMIT 1;`,
  );
  const row = res.rows?._array?.[0] as
    | {
        store_name: string;
        store_address: string;
        store_phone: string;
        farewell_message: string;
        printer_mode: PrinterMode;
        bt_device_name: string | null;
        bt_device_id: string | null;
        net_host: string | null;
        net_port: number | null;
        updated_at: string;
      }
    | undefined;

  return {
    storeName: row?.store_name ?? '',
    storeAddress: row?.store_address ?? '',
    storePhone: row?.store_phone ?? '',
    farewellMessage: row?.farewell_message ?? '',
    printerMode: row?.printer_mode ?? 'none',
    btDeviceName: row?.bt_device_name ?? null,
    btDeviceId: row?.bt_device_id ?? null,
    netHost: row?.net_host ?? null,
    netPort: row?.net_port ?? null,
    updatedAt: row?.updated_at ?? '',
  };
}

export function saveTicketSettings(input: {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  farewellMessage: string;
  printerMode: PrinterMode;
  btDeviceName?: string | null;
  btDeviceId?: string | null;
  netHost?: string | null;
  netPort?: number | null;
}): void {
  const mode = input.printerMode;

  const btDeviceName =
    mode === 'bluetooth' ? (input.btDeviceName ?? null) : null;
  const btDeviceId = mode === 'bluetooth' ? (input.btDeviceId ?? null) : null;

  const netHost = mode === 'network' ? (input.netHost ?? null) : null;
  const netPort = mode === 'network' ? (input.netPort ?? null) : null;

  getDb().execute(
    `UPDATE ticket_settings
        SET store_name       = ?,
            store_address    = ?,
            store_phone      = ?,
            farewell_message = ?,
            printer_mode     = ?,
            bt_device_name   = ?,
            bt_device_id     = ?,
            net_host         = ?,
            net_port         = ?,
            updated_at       = datetime('now')
      WHERE id = 1;`,
    [
      input.storeName.trim(),
      input.storeAddress.trim(),
      input.storePhone.trim(),
      input.farewellMessage.trim(),
      mode,
      btDeviceName,
      btDeviceId,
      netHost,
      netPort,
    ],
  );
}

