<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SvgController;
use App\Http\Controllers\Api\ExerciseController;
use App\Http\Controllers\Api\ChildProgressController;
use App\Http\Controllers\Api\ExerciseGeneratorController;
use App\Http\Controllers\Api\AdaptiveExerciseController;
use App\Http\Controllers\Api\ContentBlockController;
use App\Http\Controllers\Api\ExerciseTypesController;
use App\Http\Controllers\Api\ChildController;
use App\Http\Controllers\Admin\ExerciseTypeController as AdminExerciseTypeController;
use App\Http\Controllers\Admin\ExerciseTypeFieldController as AdminExerciseTypeFieldController;
use App\Http\Controllers\Api\ExerciseSessionController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ExerciseTemplateController;
use App\Http\Controllers\Api\WorksheetController;
use App\Http\Controllers\Api\WorksheetPresetController;
use App\Http\Controllers\Api\WorksheetLayoutController;
use App\Http\Controllers\Api\IntegrationController;
use App\Http\Controllers\Api\AssignmentController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\ComfyPresetController;
use App\Http\Controllers\Api\ComfyGenerationController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and will be assigned to
| the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Exercise sessions routes
Route::get('/sessions', [ExerciseSessionController::class, 'index']);
Route::post('/sessions', [ExerciseSessionController::class, 'store']);
Route::get('/sessions/{session}', [ExerciseSessionController::class, 'show']);
Route::get('/sessions/code/{code}', [ExerciseSessionController::class, 'getByCode']);
Route::post('/sessions/code/{code}/results', [ExerciseSessionController::class, 'updateResults']);

// SVG generation endpoint
Route::post('/svg/generate', [SvgController::class, 'generate'])->middleware('throttle:svggen');

// Exercise routes
Route::apiResource('exercises', ExerciseController::class);

// Children routes (CRUD) — require auth for tenant scoping and created_by
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('children', ChildController::class);
});

// Content blocks routes — require auth for permissions/ownership
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('content-blocks', ContentBlockController::class);
    Route::post('content-blocks/{content_block}/duplicate', [ContentBlockController::class, 'duplicate']);
});

// Exercise types registry
Route::get('/exercise-types', [ExerciseTypesController::class, 'index']);
Route::get('/exercise-types/{key}', [ExerciseTypesController::class, 'show']);

// Exercise generator routes
Route::prefix('generator')->group(function () {
    Route::post('/generate', [ExerciseGeneratorController::class, 'generate']);
    Route::post('/generate-batch', [ExerciseGeneratorController::class, 'generateBatch']);
    Route::get('/types', [ExerciseGeneratorController::class, 'getTypes']);
    Route::get('/templates', [ExerciseGeneratorController::class, 'getTemplates']);
    Route::post('/validate', [ExerciseGeneratorController::class, 'validateContent']);
});

// Graphic Dictation routes (JSON-based, no queue)
Route::prefix('generator/graphic-dictation')->group(function () {
    // Публичные роуты - не требуют аутентификации (только вычисления)
    Route::post('/validate', [\App\Http\Controllers\Api\GraphicDictationController::class, 'validatePayload']);
    Route::post('/generate-commands', [\App\Http\Controllers\Api\GraphicDictationController::class, 'generateCommands']);
    Route::post('/create-template', [\App\Http\Controllers\Api\GraphicDictationController::class, 'createTemplate']);
});


// Adaptive exercise routes
Route::prefix('adaptive')->group(function () {
    Route::get('/children/{child}/exercises', [AdaptiveExerciseController::class, 'generateForChild']);
    Route::get('/children/{child}/session', [AdaptiveExerciseController::class, 'generateSession']);
    Route::get('/children/{child}/assessment', [AdaptiveExerciseController::class, 'getSkillAssessment']);
    Route::get('/children/{child}/recommendations', [AdaptiveExerciseController::class, 'getRecommendations']);
    Route::post('/children/{child}/preferences', [AdaptiveExerciseController::class, 'updatePreferences']);
    Route::get('/children/{child}/stats', [AdaptiveExerciseController::class, 'getProgressStats']);
});

// Content Blocks routes
Route::middleware('auth:sanctum')->prefix('content-blocks')->group(function () {
    Route::get('/', [ContentBlockController::class, 'index']);
    Route::post('/', [ContentBlockController::class, 'store']);
    Route::get('/types', [ContentBlockController::class, 'blockTypes']);
    Route::get('/interactive-types', [ContentBlockController::class, 'interactiveTypes']);
    Route::get('/templates', [ContentBlockController::class, 'templates']);
    Route::get('/popular', [ContentBlockController::class, 'popular']);
    Route::post('/import', [ContentBlockController::class, 'import']);
    Route::post('/upload-file', [ContentBlockController::class, 'uploadFile']);
    Route::post('/create-exercise', [ContentBlockController::class, 'createExercise']);
    Route::post('/{block}/duplicate', [ContentBlockController::class, 'duplicate']);
    Route::get('/{block}/export', [ContentBlockController::class, 'export']);
    Route::post('/validate-for-exercise', [ContentBlockController::class, 'validateForExercise']);
    Route::get('/{block}', [ContentBlockController::class, 'show']);
    Route::put('/{block}', [ContentBlockController::class, 'update']);
    Route::delete('/{block}', [ContentBlockController::class, 'destroy']);
});

// Child progress routes
Route::get('/progress', [ChildProgressController::class, 'index']);
Route::post('/progress', [ChildProgressController::class, 'store']);
Route::get('/exercises/{exercise}/progress', [ChildProgressController::class, 'show']);

// Health endpoint used by Docker healthcheck
Route::get('/health', [HealthController::class, 'index']);

// Auth routes (Sanctum tokens)
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth-register');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth-login');
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

// Exercise Templates
Route::get('/templates', [ExerciseTemplateController::class, 'index']);
Route::get('/templates/{template}', [ExerciseTemplateController::class, 'show']);
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/templates', [ExerciseTemplateController::class, 'store']);
    Route::put('/templates/{template}', [ExerciseTemplateController::class, 'update']);
    Route::patch('/templates/{template}', [ExerciseTemplateController::class, 'update']);
    Route::delete('/templates/{template}', [ExerciseTemplateController::class, 'destroy']);

    Route::apiResource('worksheet-presets', WorksheetPresetController::class)->except(['show']);
    Route::apiResource('worksheet-layouts', WorksheetLayoutController::class)->except(['show']);
    Route::post('worksheet-layouts/{worksheetLayout}/default', [WorksheetLayoutController::class, 'setDefault']);
    Route::post('worksheet-presets/{worksheetPreset}/default', [WorksheetPresetController::class, 'setDefault']);
    Route::apiResource('worksheets', WorksheetController::class);
    Route::post('/worksheets/{worksheet}/items/{item}/regenerate', [WorksheetController::class, 'regenerateItem']);
    Route::post('/worksheets/generate', [WorksheetController::class, 'generate']);
    Route::post('/worksheets/generate-async', [WorksheetController::class, 'generateAsync']);

    // Assignments CRUD
    Route::apiResource('assignments', AssignmentController::class);
    Route::post('/assignments/{assignment}/illustration', [AssignmentController::class, 'generateIllustration']);

    // Integrations
    Route::get('/integration/comfy/health', [IntegrationController::class, 'comfyHealth']);
});

// ComfyUI Presets
// Read-only for any authenticated user
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('comfy-presets', [ComfyPresetController::class, 'index']);
    Route::get('comfy-presets/{comfyPreset}', [ComfyPresetController::class, 'show']);
    Route::post('/comfy/generate/{comfyPreset}', [ComfyGenerationController::class, 'generate']);
});
// Admin-only routes
Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::prefix('admin')->group(function () {
        Route::get('exercise-types', [AdminExerciseTypeController::class, 'index']);
        Route::post('exercise-types', [AdminExerciseTypeController::class, 'store']);
        Route::get('exercise-types/{exerciseType}', [AdminExerciseTypeController::class, 'show']);
        Route::put('exercise-types/{exerciseType}', [AdminExerciseTypeController::class, 'update']);
        Route::patch('exercise-types/{exerciseType}', [AdminExerciseTypeController::class, 'update']);
        Route::delete('exercise-types/{exerciseType}', [AdminExerciseTypeController::class, 'destroy']);

        Route::post('exercise-types/{exerciseType}/fields', [AdminExerciseTypeFieldController::class, 'store']);
        Route::delete('exercise-types/{exerciseType}/fields/{exerciseTypeField}', [AdminExerciseTypeFieldController::class, 'destroy']);
    });

    Route::post('comfy-presets', [ComfyPresetController::class, 'store']);
    Route::put('comfy-presets/{comfyPreset}', [ComfyPresetController::class, 'update']);
    Route::patch('comfy-presets/{comfyPreset}', [ComfyPresetController::class, 'update']);
    Route::delete('comfy-presets/{comfyPreset}', [ComfyPresetController::class, 'destroy']);
});
