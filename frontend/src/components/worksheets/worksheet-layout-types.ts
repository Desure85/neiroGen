export type CanvasElementType = 'text' | 'image' | 'placeholder'

export interface CanvasElement {
  id: string
  type: CanvasElementType
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  text?: string
  fontSize?: number
  fill?: string
  url?: string
  name?: string
  stroke?: string
  opacity?: number
}

export interface CanvasScene {
  width: number
  height: number
  elements: CanvasElement[]
}

export interface CanvasLayoutValue {
  scene: CanvasScene
  snapshot?: string | null
}

const DEFAULT_SCENE_WIDTH = 794
const DEFAULT_SCENE_HEIGHT = 1123

export const createEmptyCanvasScene = (overrides?: Partial<CanvasScene>): CanvasScene => ({
  width: overrides?.width ?? DEFAULT_SCENE_WIDTH,
  height: overrides?.height ?? DEFAULT_SCENE_HEIGHT,
  elements: overrides?.elements ? [...overrides.elements] : [],
})
