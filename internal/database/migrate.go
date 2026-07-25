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
			slog.Error("database migration failed and is in a dirty state. Manual administrative intervention is required to inspect failed DDL before forcing version.", "version", version, "error", err)
		}
		return fmt.Errorf("running migrations: %w", err)
	}

	version, dirty, _ := m.Version()
	slog.Info("migrations successfully synchronized", "version", version, "dirty", dirty)

	return nil
}


