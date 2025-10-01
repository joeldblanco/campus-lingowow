'use server'

import { auth } from '@/auth'
import { db } from '@/lib/db'

export async function getFloatingConversations(userId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    const conversations = await db.floatingConversation.findMany({
      where: {
        participants: {
          some: {
            userId: userId
          }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
                image: true,
                teamBadge: true
              }
            }
          },
          where: {
            userId: {
              not: userId
            }
          }
        },
        messages: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                lastName: true,
                image: true,
                teamBadge: true
              }
            }
          }
        }
      },
      orderBy: {
        lastMessageAt: 'desc'
      }
    })

    return { success: true, conversations }
  } catch (error) {
    console.error('Error getting conversations:', error)
    return { success: false, error: 'Error al cargar conversaciones' }
  }
}

export async function searchUsers(query: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    const users = await db.user.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            lastName: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            email: {
              contains: query,
              mode: 'insensitive'
            }
          }
        ],
        AND: {
          id: {
            not: session.user.id
          }
        }
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        image: true,
        teamBadge: true,
        roles: true
      },
      take: 20
    })

    return { success: true, users }
  } catch (error) {
    console.error('Error searching users:', error)
    return { success: false, error: 'Error al buscar usuarios' }
  }
}

export async function createFloatingConversation(participantIds: string[]) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    // Check if conversation already exists between these users
    if (participantIds.length === 1) {
      const existingConversation = await db.floatingConversation.findFirst({
        where: {
          isGroup: false,
          participants: {
            every: {
              userId: {
                in: [session.user.id, participantIds[0]]
              }
            }
          }
        }
      })

      if (existingConversation) {
        return { success: true, conversationId: existingConversation.id }
      }
    }

    // Create new conversation
    const conversation = await db.floatingConversation.create({
      data: {
        isGroup: participantIds.length > 1,
        participants: {
          create: [
            { userId: session.user.id },
            ...participantIds.map(id => ({ userId: id }))
          ]
        }
      }
    })

    return { success: true, conversationId: conversation.id }
  } catch (error) {
    console.error('Error creating conversation:', error)
    return { success: false, error: 'Error al crear conversación' }
  }
}

export async function sendFloatingMessage(conversationId: string, senderId: string, content: string) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.id !== senderId) {
      return { success: false, error: 'No autorizado' }
    }

    // Verify user is participant in conversation
    const participant = await db.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: senderId
      }
    })

    if (!participant) {
      return { success: false, error: 'No tienes acceso a esta conversación' }
    }

    // Create message
    const message = await db.floatingChatMessage.create({
      data: {
        conversationId,
        senderId,
        content,
        type: 'TEXT'
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            lastName: true,
            image: true,
            teamBadge: true
          }
        }
      }
    })

    // Update conversation's last message
    await db.floatingConversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: content,
        lastMessageAt: new Date()
      }
    })

    return { success: true, message }
  } catch (error) {
    console.error('Error sending message:', error)
    return { success: false, error: 'Error al enviar mensaje' }
  }
}

export async function getConversationMessages(conversationId: string, userId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.id !== userId) {
      return { success: false, error: 'No autorizado' }
    }

    // Verify user is participant
    const participant = await db.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId
      }
    })

    if (!participant) {
      return { success: false, error: 'No tienes acceso a esta conversación' }
    }

    const messages = await db.floatingChatMessage.findMany({
      where: {
        conversationId
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            lastName: true,
            image: true,
            teamBadge: true
          }
        }
      },
      orderBy: {
        timestamp: 'asc'
      }
    })

    // Mark messages as read
    await db.floatingChatMessage.updateMany({
      where: {
        conversationId,
        senderId: {
          not: userId
        },
        isRead: false
      },
      data: {
        isRead: true
      }
    })

    return { success: true, messages }
  } catch (error) {
    console.error('Error getting messages:', error)
    return { success: false, error: 'Error al cargar mensajes' }
  }
}

export async function markMessagesAsRead(conversationId: string, userId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.id !== userId) {
      return { success: false, error: 'No autorizado' }
    }

    await db.floatingChatMessage.updateMany({
      where: {
        conversationId,
        senderId: {
          not: userId
        },
        isRead: false
      },
      data: {
        isRead: true
      }
    })

    // Update participant's last read time
    await db.conversationParticipant.updateMany({
      where: {
        conversationId,
        userId
      },
      data: {
        lastReadAt: new Date()
      }
    })

    return { success: true }
  } catch (error) {
    console.error('Error marking messages as read:', error)
    return { success: false, error: 'Error al marcar mensajes como leídos' }
  }
}
