import { useCallback, useEffect, useState } from 'react'
import { approveUser, deleteUser, getUsers } from '../../api/admin'

export default function useAdmins(token, onUnauthorized) {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Runs a call; 401 signs out, other errors are rethrown for the caller to show.
  const guard = useCallback(async (call) => {
    try {
      return await call()
    } catch (e) {
      if (e.status === 401) onUnauthorized()
      throw e
    }
  }, [onUnauthorized])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setList((await guard(() => getUsers(token))).users)
    } catch (e) {
      setError(e.status ? e.message : 'Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }, [token, guard])

  useEffect(() => { reload() }, [reload])

  return {
    list, loading, error, reload,
    admins: list.filter((u) => u.status === 'approved'),
    pending: list.filter((u) => u.status === 'pending'),
    approve: async (id) => {
      const user = await guard(() => approveUser(token, id))
      setList((l) => l.map((u) => (u.id === id ? { ...u, ...user } : u)))
    },
    remove: async (id) => {
      await guard(() => deleteUser(token, id))
      setList((l) => l.filter((u) => u.id !== id))
    },
  }
}
