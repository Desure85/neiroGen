export type GraphicDictationDirection =
  | "up"
  | "down"
  | "left"
  | "right"
  | "up-left"
  | "up-right"
  | "down-left"
  | "down-right"

export interface GraphicDictationCommand {
  direction: GraphicDictationDirection
  steps: number
}

export interface GraphicDictationResult {
  commands: GraphicDictationCommand[]
  preview_image_url?: string | null
  preview_svg_url?: string | null
  instructions?: string[]
  start_row?: number | null
  start_col?: number | null
  error?: string | null
}

export interface GraphicDictationJobSnapshot {
  job_id: string
  status: string
  shards_total: number
  shards_completed: number
  result?: GraphicDictationResult
  error?: string | null
}

export interface GraphicDictationPoint {
  x: number
  y: number
}

export type GraphicDictationPath = GraphicDictationPoint[]

export interface GraphicDictationPathsPayload {
  paths: GraphicDictationPath[]
}
