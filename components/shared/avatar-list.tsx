'use client';

type Member = { id: string; full_name: string; initials: string };

export function AvatarList({ owners }: { owners: Member[] }) {
  return (
    <div className="avatars">
      {owners.length ? owners.map((owner) => <span key={owner.id} title={owner.full_name}>{owner.initials}</span>) : <em>Unassigned</em>}
    </div>
  );
}
