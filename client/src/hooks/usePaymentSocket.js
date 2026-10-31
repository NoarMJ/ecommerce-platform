
import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { io } from 'socket.io-client'
import { api } from '../services/api'

// Socket.IO connects directly to the API server using WebSocket.
const SOCKET_URL = new URL(
  import.meta.env.VITE_API_BASE_URL,
  window.location.origin
).origin

// Follows one order's payment and updates the RTK Query cache.
export function usePaymentSocket(orderId) {
  const dispatch = useDispatch()
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    if (!orderId) return undefined

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket'],
    })

    const saveStatus = (status) => {
      dispatch(
        api.util.upsertQueryData(
          'getPaymentStatus',
          orderId,
          status
        )
      )
    }

    // Subscribe to the order after connecting.
    // Repeat this after reconnection because the server
    // does not retain socket room membership.
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

    const handleUpdate = (event) => {
      if (event?.status) {
        saveStatus(event.status)
      }
    }

    const handleDown = () => setIsLive(false)

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
    }
  }, [orderId, dispatch])

  return { isLive }
}
