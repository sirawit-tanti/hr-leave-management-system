"use client";

import { useEffect, useMemo, useState } from "react";
import type { SubmitEvent } from "react";
import { apiRequest } from "@/lib/api";
import { formatDate, formatDays } from "@/lib/format";
import type { CalendarLeaveEvent, CalendarResponse } from "@/types/calendar";
import { group } from "console";

type CalendarFilters = {
  startDate: string;
  endDate: string;
};

export default function CalendarPage() {
  const defaultRange = useMemo(() => getCurrentMonthRange(), []);

  const [filters, setFilters] = useState<CalendarFilters>(defaultRange);
  const [calendar, setCalendar] = useState<CalendarResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCalendarEvents(defaultRange);
  }, [defaultRange]);

  async function loadCalendarEvents(nextFilters = filters) {
    setError("");
    setIsLoading(true);

    try {
      const searchParams = new URLSearchParams();

      if (nextFilters.startDate) {
        searchParams.set("startDate", nextFilters.startDate);
      }

      if (nextFilters.endDate) {
        searchParams.set("endDate", nextFilters.endDate);
      }

      const queryString = searchParams.toString();
      const path = queryString
        ? `/calendar/leave-events?${queryString}`
        : "/calendar/leave-events";

      const response = await apiRequest<CalendarResponse>(path);
      setCalendar(response);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load calendar",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    loadCalendarEvents(filters);
  }

  function handleThisMonth() {
    const currentMonthRange = getCurrentMonthRange();

    setFilters(currentMonthRange);
    loadCalendarEvents(currentMonthRange);
  }

  function handleNextMonth() {
    const nextMonthRange = getNextMonthRange(filters.startDate);

    setFilters(nextMonthRange);
    loadCalendarEvents(nextMonthRange);
  }

  function handlePreviousMonth() {
    const previousMonthRange = getPreviousMonthRange(filters.startDate);

    setFilters(previousMonthRange);
    loadCalendarEvents(previousMonthRange);
  }

  const groupedEvents = useMemo(() => {
    return groupEventsByDate(calendar?.events ?? []);
  }, [calendar]);

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-slate-500">Schedule</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Calendar</h1>
      </div>

      <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]"
        >
          <div>
            <label
              htmlFor="startDate"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              value={filters.startDate}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  startDate: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
              required
            />
          </div>

          <div>
            <label
              htmlFor="endDate"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              value={filters.endDate}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  endDate: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
              required
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Apply Filter
            </button>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handlePreviousMonth}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Previous Month
          </button>

          <button
            type="button"
            onClick={handleThisMonth}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            This Month
          </button>

          <button
            type="button"
            onClick={handleNextMonth}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Next Month
          </button>
        </div>
      </section>

      {error ? (
        <div className="mb-6 rounded-2xl bg-red-50 p-6 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Approved Leave Events
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Events are filtered by your role permission from the backend.
            </p>
          </div>

          {calendar ? (
            <p className="text-sm text-slate-500">
              {formatDate(calendar.range.startDate)} -{" "}
              {formatDate(calendar.range.endDate)}
            </p>
          ) : null}
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-600">Loading calendar events...</p>
        ) : null}

        {!isLoading && calendar?.events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
            <p className="text-sm text-slate-500">
              No approved leave events found in this period.
            </p>
          </div>
        ) : null}

        {!isLoading && calendar && calendar.events.length > 0 ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard
                label="Total Events"
                value={calendar.events.length}
              />
              <SummaryCard
                label="Total Leave Days"
                value={sumLeaveDays(calendar.events)}
              />
              <SummaryCard
                label="Employees on Leave"
                value={countUniqueEmployees(calendar.events)}
              />
            </div>

            <div className="space-y-5">
              {Object.entries(groupedEvents).map(([date, events]) => (
                <div key={date} className="rounded-xl border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <h3 className="font-semibold text-slate-900">
                      {formatDate(date)}
                    </h3>
                  </div>

                  <div className="divide-y divide-slate-200">
                    {events.map((event) => (
                      <CalendarEventCard key={event.id} event={event} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function CalendarEventCard({ event }: { event: CalendarLeaveEvent }) {
  const employeeName = `${event.employee.firstName} ${event.employee.lastName}`;

  return (
    <article className="p-4">
      <div className="flex flex-col gap-4 ld:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-slate-900">{employeeName}</h4>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {event.status}
            </span>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            {event.employee.employeeCode} · {event.employee.department} ·{" "}
            {event.employee.position}
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {formatDays(event.totalDays)}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <InfoBox label="Leave Type" value={event.leaveType.name} />
        <InfoBox label="Start Date" value={formatDate(event.startDate)} />
        <InfoBox label="End Date" value={formatDate(event.endDate)} />
      </div>
    </article>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function groupEventsByDate(events: CalendarLeaveEvent[]) {
  return events.reduce<Record<string, CalendarLeaveEvent[]>>(
    (groups, event) => {
      const key = event.startDate.slice(0, 10);

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(event);

      return groups;
    },
    {},
  );
}

function sumLeaveDays(events: CalendarLeaveEvent[]) {
  return events.reduce((total, event) => {
    return total + Number(event.totalDays);
  }, 0);
}

function countUniqueEmployees(events: CalendarLeaveEvent[]) {
  const employeeId = new Set(events.map((event) => event.employee.id));

  return employeeId.size;
}

function getCurrentMonthRange() {
  const now = new Date();

  return getMonthRange(now.getFullYear(), now.getMonth());
}

function getNextMonthRange(startDate: string) {
  const date = new Date(`${startDate}T00:00:00.000Z`);

  return getMonthRange(date.getFullYear(), date.getMonth() + 1);
}

function getPreviousMonthRange(startDate: string) {
  const date = new Date(`${startDate}T00:00:00.000Z`);

  return getMonthRange(date.getFullYear(), date.getMonth() - 1);
}

function getMonthRange(year: number, monthIndex: number) {
  const startDate = new Date(year, monthIndex, 1);
  const endDate = new Date(year, monthIndex + 1, 0);

  return {
    startDate: toDateInputValue(startDate),
    endDate: toDateInputValue(endDate),
  };
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}
