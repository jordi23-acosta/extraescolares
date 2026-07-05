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
      console.log('[AUTH] Reading Firestore doc: usuarios/' + user.uid)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        const profile = { uid: user.uid, ...docSnap.data() } as UserProfile
        console.log('[AUTH] Profile found:', profile.role)
        setUserProfile(profile)
      } else {
        console.log('[AUTH] No profile document found')
        setUserProfile(null)
      }
    } catch (error) {
      console.error('[AUTH] Error fetching profile:', error)
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
      console.log('[AUTH] onAuthStateChanged:', user?.email ?? 'null')
      setLoading(true)
      setCurrentUser(user)
      if (user) {
        console.log('[AUTH] Fetching profile for UID:', user.uid)
        await fetchProfile(user)
        console.log('[AUTH] Profile loaded')
      } else {
        setUserProfile(null)
      }
      setLoading(false)
      console.log('[AUTH] loading = false')
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
