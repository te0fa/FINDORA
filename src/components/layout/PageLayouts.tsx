'use client';

import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface DashboardLayoutProps {
  sidebarContent: React.ReactNode;
  navbarContent: React.ReactNode;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  sidebarContent,
  navbarContent,
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--background)',
        color: 'var(--text-primary)',
        overflowX: 'hidden',
      }}
    >
      {/* Desktop Sidebar (Permanent) */}
      <aside
        className="desktop-sidebar"
        style={{
          width: '280px',
          background: 'var(--surface)',
          borderInlineEnd: '1px solid var(--border)',
          flexShrink: 0,
          display: 'none',
          flexDirection: 'column',
          zIndex: 10,
        }}
      >
        <div style={{ padding: 'var(--space-24)', flexGrow: 1 }}>{sidebarContent}</div>
      </aside>

      {/* Mobile Sidebar (Animated overlay) */}
      <AnimatePresence>
        {sidebarOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 900,
              display: 'flex',
            }}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleSidebar}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(4px)',
              }}
            />

            {/* Sidebar drawer content */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{
                position: 'relative',
                width: '280px',
                height: '100%',
                background: 'var(--surface)',
                borderRight: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                padding: 'var(--space-24)',
                boxSizing: 'border-box',
              }}
            >
              <button
                onClick={toggleSidebar}
                style={{
                  alignSelf: 'flex-end',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  marginBottom: 'var(--space-16)',
                }}
              >
                <X size={24} />
              </button>
              <div style={{ flexGrow: 1 }}>{sidebarContent}</div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Navbar */}
        <header
          style={{
            height: '70px',
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingInline: 'var(--space-24)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <button
            className="mobile-menu-trigger"
            onClick={toggleSidebar}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              padding: 0,
            }}
          >
            <Menu size={24} />
          </button>
          <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end' }}>
            {navbarContent}
          </div>
        </header>

        {/* Content Page */}
        <main
          style={{
            padding: 'var(--space-32) var(--space-24)',
            flexGrow: 1,
            boxSizing: 'border-box',
          }}
        >
          {children}
        </main>
      </div>

      <style jsx global>{`
        @media (min-width: 1024px) {
          .desktop-sidebar {
            display: flex !important;
          }
          .mobile-menu-trigger {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
