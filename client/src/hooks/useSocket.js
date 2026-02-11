import { useEffect, useRef, useCallback, useState } from 'react'
import { io } from 'socket.io-client'

export function useSocket({ token, channelId, onNewMessage }) {
  const socketRef = useRef(null)
  const [onlineUsers, setOnlineUsers] = useState([])
  const [typingUsers, setTypingUsers] = useState([])
  const typingTimeoutRef = useRef(null)

  // Connect socket when token is available
  useEffect(() => {
    if (!token) return

    const socket = io(`http://${window.location.hostname}:3001`, {
      auth: { token },
      transports: ['websocket'],
    })

    socket.on('connect', () => {
      console.log('Socket connected')
    })

    socket.on('connect_error', (err) => {
      console.error('Socket connect error:', err.message)
      if (err.message === 'Invalid token' || err.message === 'No token provided') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/'
      }
    })

    socket.on('error', (err) => {
      console.error('Socket error:', err.message)
    })

    // Online presence
    socket.on('onlineUsers', (users) => {
      setOnlineUsers(users)
    })

    // Typing indicators
    socket.on('userTyping', ({ username }) => {
      setTypingUsers((prev) => prev.includes(username) ? prev : [...prev, username])
    })

    socket.on('userStopTyping', ({ username }) => {
      setTypingUsers((prev) => prev.filter((u) => u !== username))
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
    }
  }, [token])

  // Join channel when channelId changes — also clear typing users
  useEffect(() => {
    const socket = socketRef.current
    if (!socket || !channelId) return

    setTypingUsers([])
    socket.emit('joinChannel', { channelId })
  }, [channelId])

  // Listen for new messages
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    socket.on('newMessage', onNewMessage)

    return () => {
      socket.off('newMessage', onNewMessage)
    }
  }, [onNewMessage])

  // Send message function
  const sendMessage = useCallback(
    (content) => {
      const socket = socketRef.current
      if (!socket || !channelId) return
      socket.emit('sendMessage', { channelId, content })
      // Stop typing when message is sent
      socket.emit('stopTyping', { channelId })
    },
    [channelId]
  )

  // Emit typing event (with auto-stop after 2s of no input)
  const emitTyping = useCallback(() => {
    const socket = socketRef.current
    if (!socket || !channelId) return

    socket.emit('typing', { channelId })

    // Clear previous timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    // Auto-stop after 2 seconds of no typing
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stopTyping', { channelId })
    }, 2000)
  }, [channelId])

  return { sendMessage, emitTyping, onlineUsers, typingUsers }
}
