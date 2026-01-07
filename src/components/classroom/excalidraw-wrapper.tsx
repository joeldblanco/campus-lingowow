'use client'

import { Excalidraw } from '@excalidraw/excalidraw'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawElement = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppState = any

interface ExcalidrawWrapperProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  excalidrawAPI?: (api: any) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData?: any
  langCode?: string
  theme?: 'light' | 'dark'
  onChange?: (elements: readonly ExcalidrawElement[], appState: AppState) => void
}

export default function ExcalidrawWrapper({
  excalidrawAPI,
  initialData,
  langCode = 'es-ES',
  theme = 'light',
  onChange,
}: ExcalidrawWrapperProps) {
  const [cssLoaded, setCssLoaded] = useState(false)

  useEffect(() => {
    // Dynamically load Excalidraw CSS to avoid Next.js 15 CSS import issues
    const linkId = 'excalidraw-css'
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link')
      link.id = linkId
      link.rel = 'stylesheet'
      link.href = 'https://cdn.jsdelivr.net/npm/@excalidraw/excalidraw@0.18.0/dist/prod/index.css'
      link.onload = () => setCssLoaded(true)
      link.onerror = () => {
        console.error('Failed to load Excalidraw CSS from CDN')
        setCssLoaded(true) // Continue anyway
      }
      document.head.appendChild(link)
    } else {
      setCssLoaded(true)
    }

    // Add custom CSS to force desktop layout
    const styleId = 'excalidraw-desktop-override'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        /* Force desktop layout for Excalidraw */
        .excalidraw .App-menu_top {
          display: flex !important;
        }
        .excalidraw .App-menu_bottom {
          display: flex !important;
        }
        .excalidraw .layer-ui__wrapper__top-right {
          display: flex !important;
        }
        .excalidraw .App-toolbar-container {
          flex-direction: row !important;
        }
        .excalidraw .ToolIcon {
          width: auto !important;
          height: auto !important;
        }
        .excalidraw .Island {
          padding: 8px !important;
        }
        /* Ensure sidebar and zoom controls are visible */
        .excalidraw .layer-ui__wrapper__footer-left {
          display: flex !important;
        }
        .excalidraw .layer-ui__wrapper__footer-right {
          display: flex !important;
        }
        /* Hide Library button */
        .excalidraw button[data-testid="library-button"],
        .excalidraw .library-button,
        .excalidraw [aria-label="Library"],
        .excalidraw [aria-label="Biblioteca"] {
          display: none !important;
        }
        /* Hide Excalidraw links in menu */
        .excalidraw a[href*="excalidraw"],
        .excalidraw a[href*="github.com/excalidraw"],
        .excalidraw a[href*="twitter.com/excalidraw"],
        .excalidraw a[href*="discord"],
        .excalidraw .excalidraw-link,
        .excalidraw [data-testid="dropdown-menu-link"] {
          display: none !important;
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  if (!cssLoaded) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <Excalidraw
      excalidrawAPI={excalidrawAPI}
      initialData={initialData}
      langCode={langCode}
      theme={theme}
      onChange={onChange}
      UIOptions={{
        dockedSidebarBreakpoint: 0,
      }}
    />
  )
}
