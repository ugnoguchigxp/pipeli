# Contributing to Pipeli

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## 🚀 Getting Started

### Prerequisites
- [Bun](https://bun.sh/) v1.0 or higher
- [Docker](https://www.docker.com/) (for running middleware)
- [Bento](https://warpstreamlabs.github.io/bento/) (optional, for runtime testing)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/pipeli/pipeli.git
   cd pipeli
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database connection
   ```

4. **Build the SDK**
   ```bash
   cd sdk && bun run build
   ```

5. **Run tests**
   ```bash
   bun run test
   ```

## 📝 Development Workflow

### Code Style
This project uses [Biome](https://biomejs.dev/) for linting and formatting.

```bash
# Format code
bun run format

# Lint code
bun run lint

# Run all checks
bun run check
```

### Testing
- All new features should include tests
- Aim for 90%+ branch coverage
- Tests are located alongside source files (e.g., `source/http.test.ts`)

```bash
# Run tests
cd sdk && bun run test

# Run with coverage
cd sdk && bun run test:coverage
```

### Type Checking
```bash
bun run typecheck
```

## 🔧 Pull Request Process

1. **Fork the repository** and create a feature branch
2. **Make your changes** with clear, descriptive commits
3. **Add tests** for new functionality
4. **Update documentation** if needed
5. **Run all checks** before submitting:
   ```bash
   bun run check
   bun run typecheck
   bun run test
   ```
6. **Submit a Pull Request** with a clear description

### PR Guidelines
- Use clear, descriptive PR titles
- Reference related issues (e.g., `Fixes #123`)
- Keep PRs focused on a single feature or fix
- Respond to review feedback promptly

## 📂 Project Structure

```
.
├── sdk/            # Pipeline SDK (TypeScript)
│   └── src/        # SDK source & tests
├── pipelines/      # Pipeline definitions
├── db/             # Drizzle ORM schema
├── api/            # Anonymization API
└── docs/           # Documentation
```

## 🏥 Adding Healthcare Profiles

Contributions of new healthcare data profiles (HL7, DICOM, JAHIS, etc.) are especially welcome!

1. Create profile in `sdk/src/profile/`
2. Register in `sdk/src/profile/registry.ts`
3. Add tests following existing patterns
4. Document the profile in `docs/`

## 🐛 Reporting Issues

- Use GitHub Issues for bug reports
- Include reproduction steps
- Specify your environment (OS, Bun version, etc.)

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.
