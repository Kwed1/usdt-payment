import {
	ChatMessageSchema,
	ReactionTypes,
	UseWebSocketReturn,
	WSConnectionStatus,
	WSEventTypes,
	WSMessage
} from '@/types/chat.types'
import { useCallback, useEffect, useRef, useState } from 'react'

interface UseWebSocketProps {
	tableId: string
	token: string
	baseUrl?: string
	newsId:string
}

const DEFAULT_BASE_URL = 'wss://vowwin-api.webdevops.online'
const MAX_RECONNECT_ATTEMPTS = 5

export const useWebSocket = ({
	tableId,
	token,
	newsId,
	baseUrl = DEFAULT_BASE_URL
}: UseWebSocketProps): UseWebSocketReturn => {
	const [messages, setMessages] = useState<ChatMessageSchema[]>([])
	const [connectionStatus, setConnectionStatus] = useState<WSConnectionStatus>(WSConnectionStatus.DISCONNECTED)
	const [error, setError] = useState<string | null>(null)

	const wsRef = useRef<WebSocket | null>(null)
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const reconnectAttempts = useRef(0)

	const normalizeReactions = (reactions: any) => ({
		[ReactionTypes.LIKE]: reactions?.like || 0,
		[ReactionTypes.DISLIKE]: reactions?.dislike || 0,
		[ReactionTypes.HEART]: reactions?.heart || 0,
		[ReactionTypes.SMILE]: reactions?.smile || 0
	})

	const normalizeMessage = (messageData: any): ChatMessageSchema => ({
		...messageData,
		reactions: normalizeReactions(messageData.reactions)
	})

	const addMessageIfNotExists = useCallback((message: ChatMessageSchema) => {
		setMessages(prev => {
			const messageExists = prev.some(msg => msg.id === message.id)
			return messageExists ? prev : [...prev, message]
		})
	}, [])

	const updateMessageReactions = useCallback((messageId: string, reactions: any) => {
		setMessages(prev => prev.map(msg =>
			msg.id === messageId ? { ...msg, reactions } : msg
		))
	}, [])

	const handleSingleReaction = useCallback((reactionData: any) => {
		setMessages(prev => prev.map(msg => {
			if (msg.id === reactionData.message_id) {
				const updatedReactions = { ...msg.reactions }
				const reactionType = reactionData.reaction_type as ReactionTypes

				if (reactionData.status === 'added') {
					updatedReactions[reactionType] = (updatedReactions[reactionType] || 0) + 1
				} else if (reactionData.status === 'removed') {
					updatedReactions[reactionType] = Math.max(0, (updatedReactions[reactionType] || 0) - 1)
				}

				return { ...msg, reactions: updatedReactions }
			}
			return msg
		}))
	}, [])

	const handleMessageHistory = useCallback((historyData: any[]) => {
		const normalizedHistory = historyData.map(normalizeMessage)
		const sortedHistory = normalizedHistory.sort((a, b) =>
			new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
		)
		setMessages(sortedHistory)
	}, [])

	const handleNewMessage = useCallback((messageData: any) => {
		const normalizedMessage = normalizeMessage(messageData)
		addMessageIfNotExists(normalizedMessage)
	}, [addMessageIfNotExists])

	const handleReaction = useCallback((reactionData: any) => {
		if (reactionData.message_id && reactionData.reaction_type && reactionData.status) {
			handleSingleReaction(reactionData)
		} else if (reactionData.message_id && reactionData.reactions) {
			updateMessageReactions(reactionData.message_id, reactionData.reactions)
		}
	}, [handleSingleReaction, updateMessageReactions])

	const handleWebSocketMessage = useCallback((event: MessageEvent) => {
		try {
			const receivedData = JSON.parse(event.data)

			if (receivedData.event) {
				switch (receivedData.event) {
					case 'message_history':
						handleMessageHistory(receivedData.data)
						break

					case 'new_message':
					case 'message':
						handleNewMessage(receivedData.data)
						break

					case 'reaction':
						handleReaction(receivedData.data)
						break

					default:
						if (receivedData.data?.id && receivedData.data?.content && receivedData.data?.user) {
							const normalizedMessage = normalizeMessage(receivedData.data)
							addMessageIfNotExists(normalizedMessage)
						}
				}
			}
			else if (receivedData.id && receivedData.user && receivedData.content) {
				const normalizedMessage = normalizeMessage(receivedData)
				addMessageIfNotExists(normalizedMessage)
			}
			else if (receivedData.type) {
				const wsMessage = receivedData as WSMessage
				switch (wsMessage.type) {
					case WSEventTypes.MESSAGE:
						const messageData = normalizeMessage(wsMessage.data)
						addMessageIfNotExists(messageData)
						break

					case WSEventTypes.MESSAGE_HISTORY:
						setMessages(wsMessage.data as ChatMessageSchema[])
						break

					case WSEventTypes.REACTION:
						const reactionData = wsMessage.data as any
						if (reactionData.message_id && reactionData.reactions) {
							updateMessageReactions(reactionData.message_id, reactionData.reactions)
						}
						break

					case WSEventTypes.ERROR:
						const errorData = wsMessage.data as { error: string }
						setError(errorData.error)
						break
				}
			}
		} catch (err) {
			setError('Ошибка обработки сообщения')
		}
	}, [handleMessageHistory, handleNewMessage, handleReaction, addMessageIfNotExists, updateMessageReactions])

	const connect = useCallback(() => {
		if (wsRef.current?.readyState === WebSocket.OPEN) return

		try {
			setConnectionStatus(WSConnectionStatus.CONNECTING)
			setError(null)

			const wsUrl = `${baseUrl}/api/v1/table/${tableId}?token=${token}&news_id=${newsId}`
			const ws = new WebSocket(wsUrl)

			ws.onopen = () => {
				setConnectionStatus(WSConnectionStatus.CONNECTED)
				reconnectAttempts.current = 0
				setError(null)
			}

			ws.onmessage = handleWebSocketMessage

			ws.onerror = () => {
				setError('Ошибка подключения к чату')
				setConnectionStatus(WSConnectionStatus.ERROR)
			}

			ws.onclose = (event) => {
				setConnectionStatus(WSConnectionStatus.DISCONNECTED)

				if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS && !event.wasClean) {
					reconnectAttempts.current++
					const delay = Math.pow(2, reconnectAttempts.current) * 1000

					reconnectTimeoutRef.current = setTimeout(connect, delay)
				} else if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
					setError('Не удалось подключиться к чату. Проверьте соединение.')
				}
			}

			wsRef.current = ws
		} catch (err) {
			setError('Ошибка создания подключения')
			setConnectionStatus(WSConnectionStatus.ERROR)
		}
	}, [tableId, token, baseUrl, handleWebSocketMessage])

	const disconnect = useCallback(() => {
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current)
			reconnectTimeoutRef.current = null
		}

		if (wsRef.current) {
			wsRef.current.close(1000, 'Manual disconnect')
			wsRef.current = null
		}

		setConnectionStatus(WSConnectionStatus.DISCONNECTED)
	}, [])

	const sendMessage = useCallback((content: string) => {
		if (wsRef.current?.readyState !== WebSocket.OPEN) {
			setError('Нет подключения к чату')
			return
		}

		const message = {
			content: content.trim(),
			event: "message"
		}

		wsRef.current.send(JSON.stringify(message))
	}, [])

	const sendReaction = useCallback((messageId: string, reactionType: ReactionTypes) => {
		if (wsRef.current?.readyState !== WebSocket.OPEN) {
			setError('Нет подключения к чату')
			return
		}

		const reaction = {
			message_id: messageId,
			event: "reaction",
			reaction_type: reactionType
		}

		try {
			wsRef.current.send(JSON.stringify(reaction))
		} catch (error) {
			setError('Ошибка отправки реакции')
		}
	}, [])

	useEffect(() => {
		connect()
		return disconnect
	}, [connect, disconnect])

	useEffect(() => {
		return () => {
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current)
			}
		}
	}, [])

	return {
		messages,
		connectionStatus,
		sendMessage,
		sendReaction,
		error
	}
}