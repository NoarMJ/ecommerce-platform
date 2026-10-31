import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { io } from 'socket.io-client'
import { api } from '../services/api'

// Socket.IO runs on the API server's origin (VITE_API_BASE_URL ends in /api).
const SOCKET_URL = new URL(import.meta.env.VITE_API_BASE_URL, window.location.origin).origin

// Follows one order's payment over a socket and writes every update
// into the RTK Query cache used by useGetPaymentStatusQuery.
// isLive is true while the server is pushing updates for this order.
export function usePaymentSocket(orderId) {
  const dispatch = useDispatch()
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    if (!orderId) return undefined

const socket = io(SOCKET_URL, {
  withCredentials: true,
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: Infinity,
})
    const saveStatus = (status) => {
      dispatch(api.util.upsertQueryData('getPaymentStatus', orderId, status))
    }

    // Runs on the first connect and after every reconnect,
    // because the server forgets rooms when a socket drops.
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

    const handleUpdate = (event) => saveStatus(event.status)
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