import { BLEPrinter, type IBLEPrinter } from '@haroldtran/react-native-thermal-printer'

export interface SelectedThermalPrinter {
  kind: 'ble'
  address: string
  name: string
  selectedAt: string
}

export interface DiscoveredThermalPrinter {
  kind: 'ble'
  address: string
  name: string
}

export type PrintReceiptOutcome =
  | { ok: true }
  | {
      ok: false
      reason: 'printer_not_selected' | 'printer_unavailable' | 'print_failed'
      message: string
    }

export async function discoverBlePrinters(): Promise<DiscoveredThermalPrinter[]> {
  await BLEPrinter.init()
  const devices = await BLEPrinter.getDeviceList()
  return devices
    .map((device) => toBlePrinter(device))
    .filter((device): device is DiscoveredThermalPrinter => device !== null)
}

export async function printBleReceipt(params: {
  printer: SelectedThermalPrinter | null
  receiptText: string
}): Promise<PrintReceiptOutcome> {
  if (!params.printer) {
    return {
      ok: false,
      reason: 'printer_not_selected',
      message: 'No receipt printer selected. Pair a printer from Diagnostics first.',
    }
  }

  try {
    await BLEPrinter.init()
    await BLEPrinter.connectPrinter(params.printer.address)
    await printBillAsync(params.receiptText)
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      reason: 'print_failed',
      message: err instanceof Error ? err.message : 'Could not print receipt.',
    }
  }
}

export async function printBleTestSlip(
  printer: SelectedThermalPrinter | null,
): Promise<PrintReceiptOutcome> {
  return printBleReceipt({
    printer,
    receiptText: [
      'TD POS printer test',
      `Printer: ${printer?.name ?? 'none'}`,
      `Time: ${new Date().toISOString()}`,
      'BIR-ready receipt format',
      '',
      '',
    ].join('\n'),
  })
}

function toBlePrinter(device: IBLEPrinter): DiscoveredThermalPrinter | null {
  if (!device.inner_mac_address) return null
  return {
    kind: 'ble',
    address: device.inner_mac_address,
    name: device.device_name || device.inner_mac_address,
  }
}

function printBillAsync(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false
    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      resolve()
    }, 1200)

    BLEPrinter.printBill(text, {
      beep: false,
      cut: true,
      tailingLine: true,
      onError: (error) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        reject(error)
      },
    })
  })
}
