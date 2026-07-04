import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { User, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { UserProfile } from '../types'

interface AuthContextType {
  currentUser: User | null
  userProfile: UserProfile | null
  loading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
  refreshProfile: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (user: User) => {
    try {
      const docRef = doc(db, 'usuarios', user.uid)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        setUserProfile({ uid: user.uid, ...docSnap.data() } as UserProfile)
      } else {
        // No profile document yet — set null, will redirect to complete registration
        setUserProfile(null)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setUserProfile(null)
    }
  }, [])

  async function refreshProfile() {
    if (currentUser) {
      await fetchProfile(currentUser)
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true)
      setCurrentUser(user)
      if (user) {
        await fetchProfile(user)
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [fetchProfile])

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    refreshProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
