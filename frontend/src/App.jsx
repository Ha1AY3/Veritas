import React from 'react'
import AppRoutes from './AppRoutes'
import AuthProvider from './features/auth/Auth.context'
import { ChatProvider } from './features/Chats/context/Chat.context'
import { LibraryProvider } from './features/Chats/context/Library.context'
import { ResearchRoadmapProvider } from './features/Chats/context/Roadmap.context'
import { NotesProvider } from './features/Chats/context/Notes.context'

const App = () => {
  return (
    <LibraryProvider>
      <AuthProvider>
        <ChatProvider>
          <ResearchRoadmapProvider>
            <NotesProvider>
              <AppRoutes />
            </NotesProvider>
          </ResearchRoadmapProvider>
        </ChatProvider>
      </AuthProvider>
    </LibraryProvider>
  )
}

export default App

