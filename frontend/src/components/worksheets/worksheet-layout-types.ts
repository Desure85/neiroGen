export type CanvasElementType = 
  // Базовые элементы
  | 'text' 
  | 'image' 
  | 'placeholder'
  // Элементы упражнений
  | 'instructions'         // Блок инструкций
  | 'grid'                 // Сетка для графического диктанта
  | 'exercise_field'       // Игровое поле упражнения
  | 'answer_area'          // Область для ответов
  | 'example'              // Пример выполнения

export interface CanvasElement {
  id: string
  type: CanvasElementType
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  
  // Текстовые элементы
  text?: string
  fontSize?: number
  fill?: string
  
  // Изображения
  url?: string
  opacity?: number
  
  // Общие
  name?: string
  stroke?: string
  strokeWidth?: number
  
  // Элементы упражнений
  gridSize?: { width: number; height: number }  // Для grid
  cellSize?: number                              // Для grid
  showNumbers?: boolean                          // Для instructions
  instructionsList?: string[]                    // Для instructions
  exerciseData?: any                             // Данные упражнения
  
  // Настройки отображения
  scaleContent?: boolean                         // Масштабировать ли содержимое
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
