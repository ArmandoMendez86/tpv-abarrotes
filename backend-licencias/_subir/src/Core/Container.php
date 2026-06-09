<?php
declare(strict_types=1);

namespace App\Core;

final class Container
{
  private static array $items = [];

  public static function set(string $key, $value): void
  {
    self::$items[$key] = $value;
  }

  public static function get(string $key)
  {
    if (!array_key_exists($key, self::$items)) {
      throw new \RuntimeException("Container key not found: {$key}");
    }
    $val = self::$items[$key];
    if (is_callable($val)) {
      // Lazy factory
      $val = $val();
      self::$items[$key] = $val;
    }
    return $val;
  }
}

