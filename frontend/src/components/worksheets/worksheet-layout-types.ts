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
  // Графические инструменты
  | 'line'                 // Линия/стрелка (тип выбирается в lineStyle)
  | 'shape'                // Фигура (тип выбирается в shapeType)
  | 'number'               // Номер/метка
  | 'list'                 // Список
  | 'table'                // Таблица
  | 'checkbox'             // Чекбокс

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
  fontFamily?: string
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
  
  // Графические элементы
  x2?: number                                    // Для line - конечная точка X
  y2?: number                                    // Для line - конечная точка Y
  lineStyle?: 'solid' | 'dashed' | 'dotted' | 'arrow-end' | 'arrow-both' | 'arrow-dot'  // Для line - стиль линии
  shapeType?: 'circle' | 'rectangle' | 'ellipse' | 'triangle' | 'star' | 'pentagon' | 'hexagon'  // Для shape - тип фигуры
  cornerRadius?: number                          // Для shape - скругление углов
  numberValue?: number                           // Для number - значение номера
  numberShape?: 'circle' | 'square' | 'triangle' | 'star' | 'none'  // Для number - форма обрамления
  items?: string[]                               // Для list - элементы списка
  listStyle?: 'numbered' | 'bulleted' | 'checkbox'  // Для list - стиль
  tableRows?: number                             // Для table - количество строк
  tableCols?: number                             // Для table - количество столбцов
  tableCells?: string[][]                        // Для table - содержимое ячеек
  checkboxChecked?: boolean                      // Для checkbox - отмечен ли
  checkboxSymbol?: 'check' | 'cross' | 'dot'     // Для checkbox - символ отметки
  
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
