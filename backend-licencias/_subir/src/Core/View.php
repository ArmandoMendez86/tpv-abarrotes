<?php
declare(strict_types=1);

namespace App\Core;

final class View
{
  public static function render(string $template, array $params = []): void
  {
    extract($params, EXTR_SKIP);
    $path = __DIR__ . '/../Views/' . $template . '.php';
    if (!file_exists($path)) {
      throw new \RuntimeException("View not found: {$template}");
    }
    require $path;
  }
}

