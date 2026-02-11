import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import ChatHeader from '../components/ChatHeader.jsx'
import MessageList from '../components/MessageList.jsx'
import MessageInput from '../components/MessageInput.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useSocket } from '../hooks/useSocket.js'
import api from '../api.js'
import styles from './Chat.module.css'

export default function Chat() {
  const [channels, setChannels] = useState([])
  const [activeChannel, setActiveChannel] = useState(null)
  const [messages, setMessages] = useState([])
  const { getUser, getToken, logout } = useAuth()
  const user = getUser()
  const token = getToken()

  // Fetch channels on mount
  useEffect(() => {
    api.get('/api/channels').then((res) => {
      setChannels(res.data)
      if (res.data.length > 0) {
        setActiveChannel(res.data[0])
      }
    })
  }, [])

  // Fetch message history when channel changes
  useEffect(() => {
    if (!activeChannel) return
    api.get(`/api/messages/${activeChannel.id}`).then((res) => {
      setMessages(res.data)
    })
  }, [activeChannel])

  // Handle incoming real-time messages
  const handleNewMessage = useCallback(
    (msg) => {
      if (msg.channel_id === activeChannel?.id) {
        setMessages((prev) => [...prev, msg])
      }
    },
    [activeChannel]
  )

  const { sendMessage, emitTyping, onlineUsers, typingUsers } = useSocket({
    token,
    channelId: activeChannel?.id,
    onNewMessage: handleNewMessage,
  })

  const handleChannelCreated = (ch) => {
    setChannels((prev) => [...prev, ch])
  }

  return (
    <div className={styles.workspace}>
      <Sidebar
        channels={channels}
        activeChannel={activeChannel}
        onSelectChannel={setActiveChannel}
        onChannelCreated={handleChannelCreated}
        user={user}
        onLogout={logout}
        onlineUsers={onlineUsers}
      />
      <div className={styles.main}>
        <ChatHeader channel={activeChannel} onlineCount={onlineUsers.length} />
        <MessageList messages={messages} typingUsers={typingUsers} />
        <MessageInput
          channelName={activeChannel?.name}
          onSendMessage={sendMessage}
          onTyping={emitTyping}
        />
      </div>
    </div>
  )
}
