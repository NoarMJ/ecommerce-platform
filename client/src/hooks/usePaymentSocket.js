import { useCallback, useEffect, useRef, useState } from 'react'
import { socket } from '../socket'
import { refreshAccessToken } from '../services/authRefresh'
import { hasInitiatedPayment } from '../utils/paymentStatus'

// Payment status is read and updated only through the order's Socket.IO room.
export function usePaymentSocket(orderId) {
  const [connected, setConnected] = useState(false)
  const [status, setStatus] = useState(null)
  const [connectionError, setConnectionError] = useState('')
  const active = useRef(false)
  const keepOpenForPrompt = useRef(false)
  const refreshedOnce = useRef(false)
  const currentStatus = useRef(null)

  const applyStatus = useCallback((nextStatus) => {
    currentStatus.current = nextStatus
    setStatus(nextStatus)

    // A room is only needed while the database has an active STK request.
    if (
      !keepOpenForPrompt.current &&
      !hasInitiatedPayment(nextStatus)
    ) {
      socket.disconnect()
    }
  }, [])

  const refreshStatus = useCallback(() => new Promise((resolve, reject) => {
    if (!active.current || !orderId || !socket.connected) {
      reject(new Error('Live payment updates are not connected.'))
      return
    }

    const timeout = setTimeout(() => {
      reject(new Error('The payment status check timed out.'))
    }, 10000)

    socket.emit('payment:watch', orderId, async (res) => {
      clearTimeout(timeout)
      if (!active.current) {
        resolve(null)
        return
      }

      if (res?.ok) {
        refreshedOnce.current = false
        setConnectionError('')
        applyStatus(res.status)
        resolve(res.status)
        return
      }

      // Refresh an expired access cookie and retry after Socket.IO reconnects.
      if (res?.code === 'AUTH_REQUIRED' && !refreshedOnce.current) {
        refreshedOnce.current = true
        const ok = await refreshAccessToken()
        if (ok) {
          socket.disconnect().connect()
          resolve(null)
          return
        }
      }

      const message = res?.message || 'Could not read the payment status.'
      setConnectionError(message)
      reject(new Error(message))
    })
  }), [applyStatus, orderId])

  const waitForConnection = useCallback(() => new Promise((resolve, reject) => {
    if (socket.connected) {
      resolve()
      return
    }

    let settled = false
    const cleanup = () => {
      clearTimeout(timeout)
      socket.off('connect', onConnect)
      socket.off('connect_error', onError)
    }
    const finish = (callback, value) => {
      if (settled) return
      settled = true
      cleanup()
      callback(value)
    }
    const onConnect = () => finish(resolve)
    const onError = () => finish(reject, new Error('Could not connect to live payment updates.'))
    const timeout = setTimeout(
      () => finish(reject, new Error('Timed out connecting to live payment updates.')),
      10000
    )

    socket.once('connect', onConnect)
    socket.once('connect_error', onError)
    socket.connect()
  }), [])

  const startPromptSession = useCallback(async () => {
    keepOpenForPrompt.current = true

    try {
      await waitForConnection()
      let latestStatus = await refreshStatus()

      // An expired cookie can trigger an auth refresh and reconnect first.
      if (!latestStatus && !socket.connected) {
        await waitForConnection()
        latestStatus = await refreshStatus()
      }

      if (!latestStatus) throw new Error('Could not verify the order before prompting.')
      return latestStatus
    } catch (error) {
      keepOpenForPrompt.current = false
      if (!hasInitiatedPayment(currentStatus.current)) socket.disconnect()
      throw error
    }
  }, [refreshStatus, waitForConnection])

  const finishPromptSession = useCallback((closeWhenInactive = true) => {
    keepOpenForPrompt.current = false
    if (closeWhenInactive && !hasInitiatedPayment(currentStatus.current)) {
      socket.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!orderId) return
    active.current = true
    currentStatus.current = null
    setStatus(null)
    setConnectionError('')

    const onConnect = () => {
      setConnected(true)
      setConnectionError('')
      refreshStatus().catch((error) => {
        if (active.current) setConnectionError(error.message)
      })
    }
    const onDisconnect = () => setConnected(false)
    const onConnectError = () => {
      setConnected(false)
      setConnectionError('Could not connect to live payment updates. Reconnecting…')
    }
    const onUpdate = (data) => {
      if (String(data.orderId).toLowerCase() === String(orderId).toLowerCase()) {
        applyStatus(data.status)
      }
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)
    socket.on('payment:update', onUpdate)
    socket.connect()
    if (socket.connected) onConnect()

    return () => {
      active.current = false
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      socket.off('payment:update', onUpdate)
      socket.disconnect()
      setConnected(false)
    }
  }, [applyStatus, orderId, refreshStatus])

  return {
    connected,
    status,
    connectionError,
    refreshStatus,
    startPromptSession,
    finishPromptSession,
  }
}
