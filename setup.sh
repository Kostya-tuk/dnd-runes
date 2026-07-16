#!/bin/bash
# Скрипт автоматической настройки проекта
# Запустите: bash setup.sh

echo "========================================"
echo "  Рунический портал — установка"
echo "========================================"
echo ""

# Проверка наличия git
if ! command -v git &> /dev/null; then
    echo "ОШИБКА: git не установлен. Установите git и повторите."
    exit 1
fi

# Запрос данных
echo "Введите Supabase Project URL (например: https://abc123.supabase.co):"
read -r SUPABASE_URL

echo ""
echo "Введите Supabase anon public key:"
read -r SUPABASE_ANON_KEY

echo ""
echo "Введите URL вашего GitHub репозитория (например: https://github.com/user/repo.git):"
read -r GITHUB_REPO

# Обновление конфигурации
sed -i "s|https://YOUR-PROJECT-ID.supabase.co|$SUPABASE_URL|g" js/config.js
sed -i "s|YOUR-ANON-KEY|$SUPABASE_ANON_KEY|g" js/config.js

echo ""
echo "Конфигурация обновлена."
echo ""

# Инициализация git и загрузка
echo "Инициализация репозитория..."
git init
git add .
git commit -m "Initial commit: DND Rune Portal"
git branch -M main
git remote add origin "$GITHUB_REPO"
git push -u origin main

echo ""
echo "========================================"
echo "  Готово!"
echo "========================================"
echo ""
echo "Теперь включите GitHub Pages:"
echo "  Settings > Pages > Source: main > / (root) > Save"
echo ""
echo "И выполните SQL из файла supabase-schema.sql"
echo "в SQL Editor вашего проекта Supabase."
echo ""
echo "Сайт будет доступен по адресу вашего GitHub Pages."
