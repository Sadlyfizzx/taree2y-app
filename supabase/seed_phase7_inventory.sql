do $$
declare
  d date;
  r record;
begin
  for d in select generate_series(current_date, current_date + 30, interval '1 day')::date loop
    for r in select from_city, to_city from public.routes loop
      perform public.seed_trip_inventory_for_search(r.from_city, r.to_city, d);
    end loop;
  end loop;
end;
$$;
