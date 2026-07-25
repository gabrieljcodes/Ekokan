package database

import (
	"errors"
	"fmt"
	"log/slog"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func RunMigrations(databaseURL string) error {
	m, err := migrate.New("file://migrations", databaseURL)
	if err != nil {
		return fmt.Errorf("creating migrator: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		version, dirty, verr := m.Version()
		if verr == nil && dirty {
			slog.Warn("database is in a dirty state, attempting to force clean version and re-apply", "version", version)
			if forceErr := m.Force(int(version)); forceErr == nil {
				if retryErr := m.Up(); retryErr == nil || errors.Is(retryErr, migrate.ErrNoChange) {
					slog.Info("migrations successfully recovered and applied", "version", version)
					return nil
				}
			}
		}
		return fmt.Errorf("running migrations: %w", err)
	}

	version, dirty, _ := m.Version()
	slog.Info("migrations applied", "version", version, "dirty", dirty)

	return nil
}
