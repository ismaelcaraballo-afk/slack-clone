import { useState } from 'react'
import {
  Bold,
  Italic,
  Strikethrough,
  Link,
  List,
  ListOrdered,
  Code,
  Paperclip,
  Smile,
  AtSign,
  Mic,
  SendHorizontal,
} from 'lucide-react'
import styles from './MessageInput.module.css'

export default function MessageInput({ channelName, onSendMessage, onTyping }) {
  const [content, setContent] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!content.trim() || !onSendMessage) return
    onSendMessage(content.trim())
    setContent('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleChange = (e) => {
    setContent(e.target.value)
    if (onTyping) onTyping()
  }

  return (
    <div className={styles.container}>
      <div className={styles.inputBox}>
        {/* Formatting toolbar */}
        <div className={styles.toolbar}>
          <button type="button" className={styles.toolBtn}><Bold size={15} /></button>
          <button type="button" className={styles.toolBtn}><Italic size={15} /></button>
          <button type="button" className={styles.toolBtn}><Strikethrough size={15} /></button>
          <span className={styles.divider} />
          <button type="button" className={styles.toolBtn}><Link size={15} /></button>
          <span className={styles.divider} />
          <button type="button" className={styles.toolBtn}><List size={15} /></button>
          <button type="button" className={styles.toolBtn}><ListOrdered size={15} /></button>
          <span className={styles.divider} />
          <button type="button" className={styles.toolBtn}><Code size={15} /></button>
        </div>

        {/* Input area */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={channelName ? `Message #${channelName}` : 'Message...'}
            className={styles.input}
          />
        </form>

        {/* Bottom action icons */}
        <div className={styles.bottomRow}>
          <div className={styles.attachActions}>
            <button type="button" className={styles.toolBtn}><Paperclip size={16} /></button>
            <button type="button" className={styles.toolBtn}><Smile size={16} /></button>
            <button type="button" className={styles.toolBtn}><AtSign size={16} /></button>
            <button type="button" className={styles.toolBtn}><Mic size={16} /></button>
          </div>
          <button
            onClick={handleSubmit}
            className={`${styles.sendBtn} ${content.trim() ? styles.sendActive : ''}`}
            disabled={!content.trim()}
          >
            <SendHorizontal size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
