# Quality Checklist - После каждой задачи

Этот чеклист необходимо выполнять после завершения каждой задачи перед переходом к следующей.

## 1. Manual Testing ✓
- [ ] Функциональность работает как ожидается
- [ ] Нет визуальных багов
- [ ] Работает в light и dark темах (если применимо)
- [ ] Проверены edge cases

## 2. Automated Tests
- [ ] Написаны unit тесты (если применимо)
- [ ] Написаны integration тесты (если применимо)
- [ ] Все тесты проходят: `npm test`
- [ ] Coverage достаточный (стремимся к 80%+)

## 3. Code Review
- [ ] Запустить `code-reviewer` агента
- [ ] Исправить все CRITICAL issues
- [ ] Исправить все HIGH issues
- [ ] Рассмотреть MEDIUM issues
- [ ] Документировать решения по LOW issues

```bash
# Использовать Task tool с code-reviewer агентом
```

## 4. Security Review
- [ ] Запустить `security-reviewer` агента
- [ ] Исправить все CRITICAL issues
- [ ] Исправить все HIGH issues
- [ ] Документировать решения по MEDIUM issues
- [ ] Проверить отсутствие hardcoded secrets

```bash
# Использовать Task tool с security-reviewer агентом
```

## 5. Code Quality Checks
- [ ] **Linting**: `npm run lint` проходит без ошибок
- [ ] **Type Check**: `npm run typecheck` проходит без ошибок
- [ ] **Compilation**: `npm run compile` успешна
- [ ] Нет console.log statements (проверить хуками)

```bash
npm run lint && npm run typecheck && npm run compile
```

## 6. Performance Check (если применимо)
- [ ] Профилирование выполнено
- [ ] Нет очевидных bottlenecks
- [ ] Соблюдены NFR требования (если есть)
- [ ] Memory leaks отсутствуют

## 7. Documentation
- [ ] Обновлены комментарии в коде
- [ ] Обновлен README (если изменилось API)
- [ ] Обновлен CHANGELOG
- [ ] Добавлены JSDoc для публичных методов

## 8. Re-test
- [ ] Повторное manual testing после всех исправлений
- [ ] Все тесты проходят повторно
- [ ] Compilation успешна после всех изменений

## 9. Git Commit
- [ ] Staged только релевантные файлы
- [ ] Commit message следует conventional commits
- [ ] Commit message детальный и объясняет "почему"
- [ ] Добавлен Co-Authored-By (если применимо)

### Формат commit message:

```
<type>: <short description>

<detailed description of changes>

Features:
- Feature 1
- Feature 2

Security improvements:
- Security fix 1
- Security fix 2

Code quality:
- Quality improvement 1
- Quality improvement 2

Known limitations:
- Limitation 1
- Limitation 2

Code review: <status>
Security review: <status>
Manual testing: <status>
Linting: <status>
Type checking: <status>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Types:
- `feat`: новая функциональность
- `fix`: исправление бага
- `refactor`: рефакторинг без изменения функциональности
- `docs`: обновление документации
- `test`: добавление/обновление тестов
- `chore`: обновление зависимостей, конфигурации
- `perf`: улучшение производительности
- `ci`: изменения в CI/CD

## 10. Task Management
- [ ] Обновить статус задачи на `completed`
- [ ] Создать follow-up задачи (если нужно)
- [ ] Обновить progress в плане

---

## Summary Template

После выполнения чеклиста, предоставить пользователю summary:

```markdown
## Task [N] Completed: [Task Name]

### ✅ What was done:
- Item 1
- Item 2
- Item 3

### 🔍 Quality Checks:
- [x] Manual testing
- [x] Code review: [issues found/fixed]
- [x] Security review: [issues found/fixed]
- [x] Linting: Passed
- [x] Type checking: Passed
- [x] Compilation: Successful

### 🎯 Key Improvements:
- Improvement 1
- Improvement 2

### ⚠️ Known Limitations:
- Limitation 1 (will be addressed in Task X)

### 📝 Git Commit:
- Commit hash: [hash]
- Files changed: [count]
- Lines added/removed: +[n]/-[n]

### ➡️ Next Steps:
Ready to proceed with Task [N+1]: [Task Name]
```

---

## Notes

- Этот чеклист применяется к КАЖДОЙ задаче
- Не пропускайте шаги, даже если кажется что они не нужны
- Документируйте решения по всем найденным issues
- При блокерах - немедленно сообщайте пользователю
