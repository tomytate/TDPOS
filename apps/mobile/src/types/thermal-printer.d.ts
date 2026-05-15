declare module '@haroldtran/react-native-thermal-printer' {
  export interface PrinterOptions {
    beep?: boolean
    cut?: boolean
    tailingLine?: boolean
    encoding?: string
    onError?: (error: Error) => void
  }

  export interface IBLEPrinter {
    device: string
    device_name: string
    inner_mac_address: string
  }

  export const BLEPrinter: {
    init(): Promise<void>
    getDeviceList(): Promise<IBLEPrinter[]>
    connectPrinter(innerMacAddress: string): Promise<IBLEPrinter>
    closeConn(): Promise<void>
    printText(text: string, options?: PrinterOptions): void
    printBill(text: string, options?: PrinterOptions): void
  }
}
