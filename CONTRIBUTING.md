# Contributing to neiroGen

## Quick Start

```bash
# Clone repository
git clone https://github.com/neirogen/neiroGen.git
cd neiroGen

# Start development environment
make up

# Run tests
make test
make frontend-test
```

## Development Workflow

### 1. Branching Strategy
- `main` - production-ready code
- `develop` - integration branch
- `feature/*` - new features
- `fix/*` - bug fixes
- `hotfix/*` - urgent production fixes

### 2. Making Changes
```bash
# Create feature branch
git checkout -b feature/my-new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push -u origin feature/my-new-feature
```

### 3. Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - new feature
- `fix:` - bug fix
- `docs:` - documentation
- `style:` - code style
- `refactor:` - code refactoring
- `test:` - tests
- `chore:` - maintenance

### 4. Pull Request Process
1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass
4. Update PHPStan level (maintain or improve)
5. Request code review

## Code Style

### PHP
- Follow [PHP-FIG](https://www.php-fig.org/) standards
- Use Laravel Pint for formatting: `make lint`
- Run static analysis: `make static-analysis`

### JavaScript/TypeScript
- Use ESLint: `make frontend-lint`
- Follow project TypeScript config

## Testing

### Running Tests
```bash
# Backend tests
make test

# Frontend tests
make frontend-test

# Static analysis
cd app && ./vendor/bin/phpstan analyse
```

### Writing Tests
- Place tests in `app/tests/` directory
- Use Pest PHP for tests
- Follow naming: `Feature/TestNameTest.php`

## Security

### Reporting Vulnerabilities
Email security concerns to [contact@example.com]

### Security Checklist
- [ ] No hardcoded credentials
- [ ] All inputs validated
- [ ] SQL injection prevention (use Eloquent)
- [ ] XSS prevention (escape output)
- [ ] CSRF protection (use Laravel tokens)
- [ ] Authorization checks (use Policies)

## Documentation

### API Documentation
- Update OpenAPI spec in `app/openapi.yaml`
- Document new endpoints with request/response examples

### Code Documentation
- Document public methods with DocBlocks
- Add comments for complex logic
- Keep README.md updated

## Questions?
- Open an issue for bugs/features
- Use discussions for questions
