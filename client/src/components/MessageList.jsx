import { useEffect, useRef } from 'react'
import Message from './Message.jsx'
import styles from './MessageList.module.css'

export default function MessageList({ messages, typingUsers = [] }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingUsers])

  if (messages.length === 0) {
    return (
      <div className={styles.list}>
        <div className={styles.empty}>
          <p className={styles.emptyText}>No messages yet. Start the conversation!</p>
        </div>
        {typingUsers.length > 0 && (
          <div className={styles.typing}>
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    )
  }

  return (
    <div className={styles.list}>
      {messages.map((msg) => (
        <Message key={msg.id} message={msg} />
      ))}
      {typingUsers.length > 0 && (
        <div className={styles.typing}>
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
