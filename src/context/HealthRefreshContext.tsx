import React, { createContext, useContext, useState, useCallback } from 'react'

interface HealthRefreshContextType {
  refreshKey: number
  triggerRefresh: () => void
}

const HealthRefreshContext = createContext<HealthRefreshContextType>({
  refreshKey: 0,
  triggerRefresh: () => {},
})

export const HealthRefreshProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [refreshKey, setRefreshKey] = useState(0)
  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  return (
    <HealthRefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </HealthRefreshContext.Provider>
  )
}

export function useHealthRefresh() {
  return useContext(HealthRefreshContext)
}
