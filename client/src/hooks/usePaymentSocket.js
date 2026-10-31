
import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { io } from 'socket.io-client'
import { api } from '../services/api'

// Socket.IO connects directly to the API server.
const SOCKET_URL = new URL(
  import.meta.env.VITE_API_BASE_URL,
  window.location.origin,
).origin

export function usePaymentSocket(orderId) {
  const dispatch = useDispatch()
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    if (!orderId) {
      setIsLive(false)
      return undefined
    }

    const socket = io(SOCKET_URL, {
      withCredentials: true,

      // WebSocket only: no HTTP long-polling or fallback.
      transports: ['websocket'],

      // Automatically reconnect if the connection drops.
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    // Update the RTK Query cache with the latest payment status.
    const saveStatus = (status) => {
      if (!status) return

      dispatch(
        api.util.upsertQueryData(
          'getPaymentStatus',
          orderId,
          status,
        ),
      )
    }

    // Subscribe to the order after connecting or reconnecting.
    const watch = () => {
      socket.emit('payment:watch', orderId, (reply) => {
        if (reply?.ok) {
          saveStatus(reply.status)
          setIsLive(true)
        } else {
          setIsLive(false)
        }
      })
    }

    // Receive payment updates from the backend.
    const handleUpdate = (event) => {
      if (event?.orderId === orderId) {
        saveStatus(event.status)
      }
    }

    const handleDown = () => {
      setIsLive(false)
    }

    socket.on('connect', watch)
    socket.on('payment:update', handleUpdate)
    socket.on('disconnect', handleDown)
    socket.on('connect_error', handleDown)

    return () => {
      socket.off('connect', watch)
      socket.off('payment:update', handleUpdate)
      socket.off('disconnect', handleDown)
      socket.off('connect_error', handleDown)

      socket.disconnect()
      setIsLive(false)
    }
  }, [orderId, dispatch])

  return { isLive }
}
