<?php

use App\Services\Comfy\GraphBuilder;

it('replaces placeholders recursively in graph arrays', function (): void {
    $graph = [
        'title' => 'Hello, {{name}}!',
        'config' => [
            'prompt' => 'Draw {{theme}} scene',
            'meta' => ['seed' => '{{seed}}'],
        ],
        'static' => 42,
    ];

    $vars = [
        'name' => 'Cascade',
        'theme' => 'forest',
        'seed' => 1337,
    ];

    $result = GraphBuilder::applyVariables($graph, $vars);

    expect($result['title'])->toBe('Hello, Cascade!');
    expect($result['config']['prompt'])->toBe('Draw forest scene');
    expect($result['config']['meta']['seed'])->toBe('1337');
    expect($result['static'])->toBe(42);
});

it('keeps unknown placeholders unchanged', function (): void {
    $graph = ['text' => 'Value: {{known}}, Missing: {{unknown}}'];
    $vars = ['known' => '42'];

    $result = GraphBuilder::applyVariables($graph, $vars);

    expect($result['text'])->toBe('Value: 42, Missing: {{unknown}}');
});
