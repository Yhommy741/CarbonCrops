"""Things the farming_calendars table doesn't store but the app shows."""

from datetime import date

from ..db import fetch_all


def season(planting_date):
    """(season, year): "wet" = planted May-Sep (Thai na pi), otherwise "dry" (na prang).

    The year is the CE year the crop is harvested in; the web app shows it as the
    Buddhist year (+543) in Thai, e.g. ("dry", 2027) = "na prang 2570".
    """
    if 5 <= planting_date.month <= 9:
        return "wet", planting_date.year
    return "dry", planting_date.year + (1 if planting_date.month >= 10 else 0)


def season_label(planting_date):
    """English label for messages, e.g. "Dry season 2027"."""
    kind, year = season(planting_date)
    return f"{kind.capitalize()} season {year}"


def calendar_status(calendar, today=None):
    """planned / active / harvested, from the planting and harvest dates."""
    today = today or date.today()
    if calendar["harvest_date"] is not None:
        return "harvested"
    if calendar["planting_date"] > today:
        return "planned"
    return "active"


def describe(calendar, today=None):
    """Add the derived fields to a farming_calendars row (in place) and return it."""
    calendar["season"], calendar["season_year"] = season(calendar["planting_date"])
    calendar["status"] = calendar_status(calendar, today)
    return calendar


def rice_stages(conn):
    return fetch_all(conn, "SELECT stage_no, stage_name, start_day, end_day FROM rice_stages ORDER BY stage_no")


def stage_on(stages, planting_date, day):
    """The rice_stages row for `day` (days before planting -> stage 1, after the last -> last)."""
    offset = (day - planting_date).days
    for stage in stages:
        if stage["start_day"] <= offset <= stage["end_day"]:
            return stage
    return stages[0] if offset < stages[0]["start_day"] else stages[-1]
