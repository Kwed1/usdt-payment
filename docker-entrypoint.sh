#!/bin/sh
set -e

# Создаем env.js в папке dist (откуда http-server обслуживает файлы)
echo "window._env_ = {" > /app/dist/env.js

# Используем awk для правильного форматирования (избегаем проблем с подпроцессами в while)
# Обрабатываем значения, которые могут содержать '='
printenv | grep '^VITE_' | awk -F'=' '{
  key = $1
  # Объединяем все части после первого '=' в значение
  value = ""
  for (i = 2; i <= NF; i++) {
    if (i > 2) value = value "="
    value = value $i
  }
  if (NR == 1) {
    print "  " key ": \"" value "\""
  } else {
    print "  ," key ": \"" value "\""
  }
}' >> /app/dist/env.js

echo "};" >> /app/dist/env.js

exec "$@"
