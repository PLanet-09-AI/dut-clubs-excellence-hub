export type Nomination = {
  id: string;
  createdAt: string;
  categoryId: string;
  nomineeName: string;
  nomineeEmail: string;
  studentNumber: string;
  faculty: string;
  yearOfStudy: string;
  motivation: string;
  nominatorName: string;
  nominatorEmail: string;
  status: "pending" | "shortlisted" | "rejected";
};

const KEY = "dut-awards-nominations-v1";

export function loadNominations(): Nomination[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveNominations(list: Nomination[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function addNomination(n: Omit<Nomination, "id" | "createdAt" | "status">) {
  const list = loadNominations();
  const entry: Nomination = {
    ...n,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  list.unshift(entry);
  saveNominations(list);
  return entry;
}

export function setStatus(id: string, status: Nomination["status"]) {
  const list = loadNominations().map((n) => (n.id === id ? { ...n, status } : n));
  saveNominations(list);
  return list;
}

export function exportShortlistedCSV(list: Nomination[]) {
  const rows = list.filter((n) => n.status === "shortlisted");
  const header = ["Category", "Nominee", "Student #", "Faculty", "Year", "Email", "Nominator", "Submitted"];
  const csv = [
    header.join(","),
    ...rows.map((r) =>
      [r.categoryId, r.nomineeName, r.studentNumber, r.faculty, r.yearOfStudy, r.nomineeEmail, r.nominatorName, r.createdAt]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\n");
  return csv;
}
