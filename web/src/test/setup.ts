import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'

// jsdom has no audio playback: make play/pause harmless
HTMLMediaElement.prototype.play = () => Promise.reject(new Error("no audio in tests"))
HTMLMediaElement.prototype.pause = () => {}
