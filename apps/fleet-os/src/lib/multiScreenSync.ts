/**
 * Cross-Window Broadcast Channel Synchronization for Multi-Monitor Wall
 * Synchronizes order dispatches, focus selection, emergency acknowledgments,
 * and driver updates across multiple browser windows / physical screens in real-time.
 */

import { useFleetStore } from '../store/useFleetStore'

export type MultiScreenSyncEvent =
  | { type: 'FOCUS_ORDER'; orderId: string | null }
  | { type: 'DISPATCH_RESCUE'; orderId: string; rescueDriverId: string }
  | { type: 'ASSIGN_ORDER'; orderId: string; driverId?: string }
  | { type: 'SYNC_HEARTBEAT'; timestamp: number; activeOrdersCount: number }

const CHANNEL_NAME = 'taiwan_fleet_multiscreen_bus'

class MultiScreenSyncBus {
  private channel: BroadcastChannel | null = null

  init() {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return
    if (this.channel) return

    this.channel = new BroadcastChannel(CHANNEL_NAME)
    this.channel.onmessage = (event: MessageEvent<MultiScreenSyncEvent>) => {
      this.handleIncomingMessage(event.data)
    }
  }

  private handleIncomingMessage(data: MultiScreenSyncEvent) {
    const store = useFleetStore.getState()
    if (!data || !data.type) return

    switch (data.type) {
      case 'FOCUS_ORDER':
        if (store.focusOrderId !== data.orderId) {
          useFleetStore.setState({ focusOrderId: data.orderId })
        }
        break
      case 'DISPATCH_RESCUE':
        store.dispatchRescueDriver(data.orderId, data.rescueDriverId)
        break
      case 'ASSIGN_ORDER':
        store.assignOrder(data.orderId, data.driverId)
        break
      case 'SYNC_HEARTBEAT':
        break
    }
  }

  broadcast(event: MultiScreenSyncEvent) {
    if (!this.channel) {
      this.init()
    }
    try {
      this.channel?.postMessage(event)
    } catch {
      // Broadcast fallback
    }
  }

  close() {
    if (this.channel) {
      this.channel.close()
      this.channel = null
    }
  }
}

export const multiScreenBus = new MultiScreenSyncBus()
