// Hosted downloads arrive with progress and base64 file chunks on the same
// request. Never treat a truncated response as a successfully downloaded file.
export async function readHostedDownload(response, onProgress = () => {}) {
  if (!response.body) throw new Error('The download stream could not be opened.')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const chunks = []
  let buffer = ''
  let file = null
  let received = 0
  let complete = false

  function accept(line) {
    if (!line.trim()) return
    const record = JSON.parse(line)
    if (complete) throw new Error('Unexpected data after the completed download.')
    if (record.type === 'error') throw new Error(record.error || 'The download failed.')
    if (record.type === 'progress') onProgress(record)
    else if (record.type === 'file') {
      if (file || !Number.isSafeInteger(record.size) || record.size < 0 || record.size > 512 * 1024 * 1024) {
        throw new Error('The hosted file is too large or has invalid metadata.')
      }
      file = record
      onProgress({ progress: 99, phase: 'receiving file' })
    } else if (record.type === 'chunk') {
      if (!file) throw new Error('The download is missing its file details.')
      const data = Uint8Array.from(atob(record.data), (char) => char.charCodeAt(0))
      received += data.length
      if (received > file.size) throw new Error('The download exceeded its expected size.')
      chunks.push(data)
    } else if (record.type === 'done') complete = true
  }

  try {
    while (true) {
      const { value, done } = await reader.read()
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
      let newline
      while ((newline = buffer.indexOf('\n')) !== -1) {
        accept(buffer.slice(0, newline))
        buffer = buffer.slice(newline + 1)
      }
      if (buffer.length > 256 * 1024) throw new Error('The download stream is invalid.')
      if (done) break
    }
    if (buffer.trim()) accept(buffer)
    if (!complete || !file || received !== file.size) {
      throw new Error('The download was interrupted. Try a shorter clip or use the local app.')
    }
    return { file: new Blob(chunks, { type: 'application/octet-stream' }), filename: file.filename }
  } catch (err) {
    await reader.cancel().catch(() => {})
    throw err
  } finally {
    reader.releaseLock()
  }
}
