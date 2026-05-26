<?php
declare(strict_types=1);

namespace App\Core;

final class Router
{
  private array $routes = [
    'GET' => [],
    'POST' => [],
  ];

  public function get(string $path, array $handler): void
  {
    $this->routes['GET'][$this->normalize($path)] = $handler;
  }

  public function post(string $path, array $handler): void
  {
    $this->routes['POST'][$this->normalize($path)] = $handler;
  }

  public function dispatch(): void
  {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $uri = $_SERVER['REQUEST_URI'] ?? '/';
    $path = parse_url($uri, PHP_URL_PATH) ?: '/';
    $path = $this->normalize($path);

    $handler = $this->routes[$method][$path] ?? null;
    if (!$handler) {
      http_response_code(404);
      header('Content-Type: text/plain; charset=utf-8');
      echo "404 Not Found";
      return;
    }

    [$class, $action] = $handler;
    $controller = new $class();
    $controller->$action();
  }

  private function normalize(string $path): string
  {
    if ($path === '') return '/';
    if ($path[0] !== '/') $path = '/' . $path;
    // Sin trailing slash (excepto root)
    if (strlen($path) > 1) {
      $path = rtrim($path, '/');
    }
    return $path;
  }
}

