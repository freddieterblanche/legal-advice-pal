
WITH provs AS (
  SELECT id, name FROM public.provinces
),
new_towns(province_name, name) AS (
  VALUES
  -- Western Cape
  ('Western Cape','Atlantis'),('Western Cape','Bellville'),('Western Cape','Brackenfell'),
  ('Western Cape','Goodwood'),('Western Cape','Parow'),('Western Cape','Milnerton'),
  ('Western Cape','Kraaifontein'),('Western Cape','Kuilsrivier'),('Western Cape','Khayelitsha'),
  ('Western Cape','Mitchells Plain'),('Western Cape','Somerset West'),('Western Cape','Strand'),
  ('Western Cape','Gordons Bay'),('Western Cape','Fish Hoek'),('Western Cape','Simon''s Town'),
  ('Western Cape','Hout Bay'),('Western Cape','Kommetjie'),('Western Cape','Noordhoek'),
  ('Western Cape','Worcester'),('Western Cape','Robertson'),('Western Cape','Montagu'),
  ('Western Cape','Ashton'),('Western Cape','Bonnievale'),('Western Cape','McGregor'),
  ('Western Cape','Tulbagh'),('Western Cape','Wellington'),('Western Cape','Franschhoek'),
  ('Western Cape','Saldanha'),('Western Cape','Vredenburg'),('Western Cape','Lambert''s Bay'),
  ('Western Cape','Vredendal'),('Western Cape','Citrusdal'),('Western Cape','Piketberg'),
  ('Western Cape','Porterville'),('Western Cape','Beaufort West'),('Western Cape','Laingsburg'),
  ('Western Cape','Prince Albert'),('Western Cape','Calitzdorp'),('Western Cape','De Rust'),
  ('Western Cape','Uniondale'),('Western Cape','Ladismith'),('Western Cape','Barrydale'),
  ('Western Cape','Heidelberg WC'),('Western Cape','Witsand'),('Western Cape','Arniston'),
  ('Western Cape','Napier'),('Western Cape','Genadendal'),('Western Cape','Villiersdorp'),
  ('Western Cape','Wilderness'),('Western Cape','Sedgefield'),('Western Cape','Nature''s Valley'),
  -- Gauteng
  ('Gauteng','Sandton'),('Gauteng','Randburg'),('Gauteng','Roodepoort'),('Gauteng','Soweto'),
  ('Gauteng','Alberton'),('Gauteng','Boksburg'),('Gauteng','Benoni'),('Gauteng','Brakpan'),
  ('Gauteng','Springs'),('Gauteng','Kempton Park'),('Gauteng','Edenvale'),('Gauteng','Germiston'),
  ('Gauteng','Krugersdorp'),('Gauteng','Centurion'),('Gauteng','Midrand'),('Gauteng','Vereeniging'),
  ('Gauteng','Vanderbijlpark'),('Gauteng','Meyerton'),('Gauteng','Heidelberg GP'),
  ('Gauteng','Bronkhorstspruit'),('Gauteng','Cullinan'),('Gauteng','Hammanskraal'),
  ('Gauteng','Carletonville'),('Gauteng','Westonaria'),('Gauteng','Magaliesburg'),
  ('Gauteng','Fourways'),('Gauteng','Rosebank'),('Gauteng','Melville'),('Gauteng','Parktown'),
  ('Gauteng','Tembisa'),('Gauteng','Katlehong'),('Gauteng','Vosloorus'),('Gauteng','Daveyton'),
  ('Gauteng','Mamelodi'),('Gauteng','Atteridgeville'),('Gauteng','Soshanguve'),('Gauteng','Akasia'),
  -- KwaZulu-Natal
  ('KwaZulu-Natal','Pinetown'),('KwaZulu-Natal','Westville'),('KwaZulu-Natal','Umhlanga'),
  ('KwaZulu-Natal','Ballito'),('KwaZulu-Natal','Hillcrest'),('KwaZulu-Natal','Kloof'),
  ('KwaZulu-Natal','Amanzimtoti'),('KwaZulu-Natal','Scottburgh'),('KwaZulu-Natal','Margate'),
  ('KwaZulu-Natal','Port Shepstone'),('KwaZulu-Natal','Hibberdene'),('KwaZulu-Natal','Empangeni'),
  ('KwaZulu-Natal','Richards Bay'),('KwaZulu-Natal','Eshowe'),('KwaZulu-Natal','Mtubatuba'),
  ('KwaZulu-Natal','St Lucia'),('KwaZulu-Natal','Vryheid'),('KwaZulu-Natal','Newcastle'),
  ('KwaZulu-Natal','Dundee'),('KwaZulu-Natal','Ladysmith'),('KwaZulu-Natal','Estcourt'),
  ('KwaZulu-Natal','Howick'),('KwaZulu-Natal','Mooi River'),('KwaZulu-Natal','Underberg'),
  ('KwaZulu-Natal','Kokstad'),('KwaZulu-Natal','Ixopo'),('KwaZulu-Natal','KwaDukuza'),
  ('KwaZulu-Natal','Stanger'),('KwaZulu-Natal','Tongaat'),('KwaZulu-Natal','Verulam'),
  ('KwaZulu-Natal','Phoenix'),('KwaZulu-Natal','Chatsworth'),('KwaZulu-Natal','Pietermaritzburg'),
  ('KwaZulu-Natal','Greytown'),('KwaZulu-Natal','Bergville'),('KwaZulu-Natal','Winterton'),
  ('KwaZulu-Natal','Hluhluwe'),('KwaZulu-Natal','Pongola'),('KwaZulu-Natal','Ulundi'),
  ('KwaZulu-Natal','Nongoma'),('KwaZulu-Natal','Ramsgate'),('KwaZulu-Natal','Uvongo'),
  -- Eastern Cape
  ('Eastern Cape','East London'),('Eastern Cape','Mthatha'),('Eastern Cape','Queenstown'),
  ('Eastern Cape','Komani'),('Eastern Cape','King William''s Town'),('Eastern Cape','Bhisho'),
  ('Eastern Cape','Stutterheim'),('Eastern Cape','Fort Beaufort'),('Eastern Cape','Alice'),
  ('Eastern Cape','Makhanda'),('Eastern Cape','Grahamstown'),('Eastern Cape','Port Alfred'),
  ('Eastern Cape','Kenton-on-Sea'),('Eastern Cape','Jeffreys Bay'),('Eastern Cape','St Francis Bay'),
  ('Eastern Cape','Humansdorp'),('Eastern Cape','Hankey'),('Eastern Cape','Kareedouw'),
  ('Eastern Cape','Cradock'),('Eastern Cape','Graaff-Reinet'),('Eastern Cape','Aberdeen'),
  ('Eastern Cape','Somerset East'),('Eastern Cape','Bedford'),('Eastern Cape','Adelaide'),
  ('Eastern Cape','Kariega'),('Eastern Cape','Uitenhage'),('Eastern Cape','Despatch'),
  ('Eastern Cape','Patensie'),('Eastern Cape','Butterworth'),('Eastern Cape','Idutywa'),
  ('Eastern Cape','Lusikisiki'),('Eastern Cape','Flagstaff'),('Eastern Cape','Bizana'),
  ('Eastern Cape','Port St Johns'),('Eastern Cape','Coffee Bay'),('Eastern Cape','Aliwal North'),
  ('Eastern Cape','Burgersdorp'),('Eastern Cape','Sterkstroom'),('Eastern Cape','Molteno'),
  ('Eastern Cape','Cofimvaba'),('Eastern Cape','Engcobo'),('Eastern Cape','Tsomo'),
  -- Free State
  ('Free State','Welkom'),('Free State','Sasolburg'),('Free State','Kroonstad'),
  ('Free State','Bethlehem'),('Free State','Harrismith'),('Free State','Phuthaditjhaba'),
  ('Free State','Parys'),('Free State','Heilbron'),('Free State','Frankfort'),('Free State','Vrede'),
  ('Free State','Reitz'),('Free State','Senekal'),('Free State','Ficksburg'),('Free State','Ladybrand'),
  ('Free State','Clarens'),('Free State','Bothaville'),('Free State','Virginia'),
  ('Free State','Odendaalsrus'),('Free State','Theunissen'),('Free State','Ventersburg'),
  ('Free State','Hennenman'),('Free State','Winburg'),('Free State','Brandfort'),
  ('Free State','Hoopstad'),('Free State','Trompsburg'),('Free State','Edenburg'),
  ('Free State','Smithfield'),('Free State','Zastron'),('Free State','Wepener'),
  ('Free State','Botshabelo'),('Free State','Thaba Nchu'),('Free State','Petrusburg'),
  ('Free State','Jagersfontein'),('Free State','Fauresmith'),('Free State','Marquard'),
  -- Mpumalanga
  ('Mpumalanga','Mbombela'),('Mpumalanga','Nelspruit'),('Mpumalanga','eMalahleni'),
  ('Mpumalanga','Witbank'),('Mpumalanga','Middelburg MP'),('Mpumalanga','Secunda'),
  ('Mpumalanga','Ermelo'),('Mpumalanga','Standerton'),('Mpumalanga','Bethal'),
  ('Mpumalanga','Volksrust'),('Mpumalanga','Piet Retief'),('Mpumalanga','Barberton'),
  ('Mpumalanga','White River'),('Mpumalanga','Hazyview'),('Mpumalanga','Sabie'),
  ('Mpumalanga','Graskop'),('Mpumalanga','Mashishing'),('Mpumalanga','Lydenburg'),
  ('Mpumalanga','Belfast'),('Mpumalanga','Dullstroom'),('Mpumalanga','Komatipoort'),
  ('Mpumalanga','Malelane'),('Mpumalanga','Kaapmuiden'),('Mpumalanga','Carolina'),
  ('Mpumalanga','Machadodorp'),('Mpumalanga','Waterval Boven'),('Mpumalanga','Pilgrim''s Rest'),
  ('Mpumalanga','Delmas'),('Mpumalanga','Kriel'),('Mpumalanga','Ogies'),('Mpumalanga','Hendrina'),
  -- Limpopo
  ('Limpopo','Polokwane'),('Limpopo','Tzaneen'),('Limpopo','Phalaborwa'),('Limpopo','Mokopane'),
  ('Limpopo','Modimolle'),('Limpopo','Bela-Bela'),('Limpopo','Thabazimbi'),('Limpopo','Lephalale'),
  ('Limpopo','Musina'),('Limpopo','Makhado'),('Limpopo','Louis Trichardt'),('Limpopo','Giyani'),
  ('Limpopo','Hoedspruit'),('Limpopo','Burgersfort'),('Limpopo','Tubatse'),('Limpopo','Marble Hall'),
  ('Limpopo','Groblersdal'),('Limpopo','Mookgophong'),('Limpopo','Naboomspruit'),
  ('Limpopo','Vaalwater'),('Limpopo','Alldays'),('Limpopo','Tshipise'),('Limpopo','Thohoyandou'),
  ('Limpopo','Sibasa'),('Limpopo','Elim'),('Limpopo','Letsitele'),('Limpopo','Haenertsburg'),
  ('Limpopo','Magoebaskloof'),('Limpopo','Mokerong'),
  -- North West
  ('North West','Mahikeng'),('North West','Mafikeng'),('North West','Klerksdorp'),
  ('North West','Potchefstroom'),('North West','Rustenburg'),('North West','Brits'),
  ('North West','Lichtenburg'),('North West','Vryburg'),('North West','Zeerust'),
  ('North West','Schweizer-Reneke'),('North West','Wolmaransstad'),('North West','Ventersdorp'),
  ('North West','Hartbeespoort'),('North West','Koster'),('North West','Swartruggens'),
  ('North West','Taung'),('North West','Stilfontein'),('North West','Orkney'),
  ('North West','Mmabatho'),('North West','Coligny'),('North West','Sannieshof'),
  ('North West','Delareyville'),('North West','Bloemhof'),('North West','Christiana'),
  ('North West','Marikana'),('North West','Phokeng'),('North West','Mogwase'),
  -- Northern Cape
  ('Northern Cape','Kimberley'),('Northern Cape','Upington'),('Northern Cape','Kuruman'),
  ('Northern Cape','Springbok'),('Northern Cape','De Aar'),('Northern Cape','Colesberg'),
  ('Northern Cape','Hartswater'),('Northern Cape','Calvinia'),('Northern Cape','Sutherland'),
  ('Northern Cape','Postmasburg'),('Northern Cape','Kathu'),('Northern Cape','Carnarvon'),
  ('Northern Cape','Prieska'),('Northern Cape','Hopetown'),('Northern Cape','Douglas'),
  ('Northern Cape','Britstown'),('Northern Cape','Williston'),('Northern Cape','Pofadder'),
  ('Northern Cape','Port Nolloth'),('Northern Cape','Aggeneys'),('Northern Cape','Lime Acres'),
  ('Northern Cape','Danielskuil'),('Northern Cape','Olifantshoek'),('Northern Cape','Keimoes'),
  ('Northern Cape','Kakamas'),('Northern Cape','Augrabies'),('Northern Cape','Loeriesfontein'),
  ('Northern Cape','Garies'),('Northern Cape','Kamieskroon'),('Northern Cape','Concordia'),
  ('Northern Cape','Steinkopf'),('Northern Cape','Warrenton'),('Northern Cape','Jan Kempdorp'),
  ('Northern Cape','Barkly West'),('Northern Cape','Niewoudtville')
)
INSERT INTO public.towns (name, slug, province_id, is_major_city)
SELECT
  -- Strip the disambiguating " WC"/" MP"/" GP" suffix from the stored name
  regexp_replace(nt.name, ' (WC|GP|MP)$', '') AS name,
  lower(regexp_replace(regexp_replace(nt.name, '[^a-zA-Z0-9]+', '-', 'g'), '^-|-$', '', 'g')) AS slug,
  p.id,
  false
FROM new_towns nt
JOIN provs p ON p.name = nt.province_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.towns t
  WHERE t.province_id = p.id
    AND lower(t.name) = lower(regexp_replace(nt.name, ' (WC|GP|MP)$', ''))
);
