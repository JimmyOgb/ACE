interface EthereumRequestArguments {
  method: string
  params?: readonly unknown[] | object
}

interface BrowserEthereumProvider {
  request(args: EthereumRequestArguments): Promise<unknown>
  on?(event: string, listener: (...args: unknown[]) => void): void
  removeListener?(event: string, listener: (...args: unknown[]) => void): void
}

interface Window {
  ethereum?: BrowserEthereumProvider
}
