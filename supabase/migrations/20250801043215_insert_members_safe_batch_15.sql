-- Insert member data batch 15 (records 2811-3010)
-- Using ON CONFLICT DO NOTHING to avoid duplicate key errors
-- Table structure: id, member_number (NOT NULL), full_name (NOT NULL), created_at, updated_at, sequence_number
INSERT INTO public.members (member_number, full_name, sequence_number) VALUES
('2022002920', 'Chairini', 2811),
('2023003188', 'Mohammad Reza Firdaus', 2812),
('2022002922', 'Achmad Yani', 2813),
('2022003009', 'Dian Karina', 2814),
('2025003778', 'Muhamad Iqbal Syauqi', 2815),
('2022002895', 'Willy Huang', 2816),
('2022002921', 'Ingrid Wilianto', 2817),
('2022002882', 'Johan Trihantoro', 2818),
('2022003122', 'Tunggul S Sitindjak', 2819),
('2022002881', 'Muhamad Yusron Wahyudi', 2820),
('2022002918', 'Ulfah Aliyatul Wathonah', 2821),
('2022002901', 'Novinta', 2822),
('2022002955', 'Yunita Prapti Ramdhani', 2823),
('2022003130', 'Bram Timoteus Setiadi Pakpahan', 2824),
('2023003337', 'Monika Vini Stevani', 2825),
('2022002902', 'FITRIYA', 2826),
('2022002893', 'David', 2827),
('2022002977', 'Lay Eddy Cahya', 2828),
('2022002944', 'Cheria Christi Widjaja', 2829),
('2022002924', 'MAY SUSANTHY', 2830),
('2022002904', 'Nur Muhlisin', 2831),
('2022002936', 'Sendi Christiandi', 2832),
('2022003115', 'Fransil Tessy Sinaulan', 2833),
('2022002942', 'ADRIAN GOUTAMA', 2834),
('2022002929', 'Irene Yunita', 2835),
('2022002954', 'Savira Gabriel Evani', 2836),
('2022002907', 'Widrawan Hindrawan', 2837),
('2023003252', 'FIRDHA RACHMAN', 2838),
('2023003294', 'Amalia Nur Rahmadhani', 2839),
('2022003109', 'Gaza Farhan', 2840),
('2022002934', 'Faishal Aulia Darmawan', 2841),
('2023003274', 'Naresh Krishnan', 2842),
('2022003107', 'MASRIA DNT SINAMBELA', 2843),
('2022002928', 'Benrik Anthony', 2844),
('2022003047', 'Nengsih Irma Mahda Dia Boru Limbong', 2845),
('2024003508', 'Yessica M Permatasari Gultom', 2846),
('2024003522', 'Fernaldy Tanoko', 2847),
('2022002979', 'Nanda Puput Rahmawati', 2848),
('2024003589', 'Rio Pardamean Hasudungan', 2849),
('2022002957', 'Ade Yusriansyah', 2850),
('2022002965', 'Indah Farisanti', 2851),
('2025003689', 'GLENDY VIRAJATI SIAGIAN', 2852),
('2022002943', 'Andrew Handaya', 2853),
('2022002960', 'Dany Aditya Liza, S.M.B', 2854),
('2022002990', 'Anta Fahreza Putra Hasyim', 2855),
('2022002967', 'PRIWHARTI LURY PERDHANA', 2856),
('2024003431', 'Jonathan Laurentxius', 2857),
('2022002956', 'Henny Indrawati', 2858),
('2022002949', 'Untung Kurniawan', 2859),
('2022003024', 'Brigitta Dewi Siswaningsih', 2860),
('2022003043', 'Evi Purnamasari', 2861),
('2025003728', 'RIZAD ALMALIQ MOHAMMAD KHAN', 2862),
('2022002969', 'MINARTI', 2863),
('2022002978', 'Agung Wahyu Nugroho', 2864),
('2022002968', 'Rudi D. Amrianto', 2865),
('2023003265', 'Nashrullah Putra Sulaeman', 2866),
('2022002984', 'Ovi Novianto', 2867),
('2022003006', 'Ahmad Rizky Maryadi', 2868),
('2022002959', 'Bimo Satrio', 2869),
('2022002962', 'Gusti Agung Aditya Wibhawa', 2870),
('2023003321', 'Raja Nobriansyah', 2871),
('2022002970', 'Arman Nugraha, S.Si. MM.', 2872),
('2025003766', 'Muhammad Abdul Muis', 2873),
('2023003157', 'Retno Hapsari', 2874),
('2024003537', 'Inggar Arie Mukti', 2875),
('2022003015', 'Andika Prakasa', 2876),
('2022002985', 'Puri Pramudita, MM', 2877),
('2022002982', 'Edwin Kurniawan', 2878),
('2022002986', 'Putu Chantika Putri Dhammayanti', 2879),
('2022003007', 'Efrizal', 2880),
('2022002991', 'Erlina Simanjuntak', 2881),
('2022002981', 'Dharmitro Siman', 2882),
('2022002996', 'Theo Satria', 2883),
('2022003100', 'Evan Lie Hadiwidjaja', 2884),
('2022003012', 'Kornelis Pandu Wicaksono', 2885),
('2025003754', 'Azizah Rarasati W', 2886),
('2022003001', 'ADE ILHAM ILAHI', 2887),
('2022002997', 'Devi Imelda Kristanty, ST', 2888),
('2022003004', 'Abdul Rachman Saleh', 2889),
('2022003005', 'AHMAD RAFIF RAYA', 2890),
('2022002999', 'Siska Tristanti Sutjiadi', 2891),
('2022003070', 'Gusti Chandra Kirana Malik', 2892),
('2022003020', 'Imelda Octavia', 2893),
('2022003035', 'Muh Idhiel Fitriawan R', 2894),
('2022003059', 'Monicha Augustia', 2895),
('2022003008', 'Dina Lestari Sitompul', 2896),
('2022003013', 'Bambang Setyobudi', 2897),
('2024003505', 'Anggi Oktaviana Irvan', 2898),
('2022003011', 'Dega Gian Rapidity', 2899),
('2022003045', 'Laras Raudina Putri', 2900),
('2022003017', 'Sarah Puspa', 2901),
('2025003684', 'I Putu Aditya Wardana', 2902),
('2022003014', 'Tresia Puspasari', 2903),
('2023003263', 'AZWARSYAH', 2904),
('2022003018', 'Viandry Julizen', 2905),
('2022003065', 'Agustinus Harjono', 2906),
('2022003048', 'Jason Christopher', 2907),
('2022003030', 'Akbar Muslim', 2908),
('2022003063', 'Anthony Kalisaran', 2909),
('2022003040', 'Ir. Arief Budiman', 2910),
('2022003026', 'Hany Trianawati', 2911),
('2022003118', 'Putri Myra Syanadia', 2912),
('2024003592', 'Kanty Raviandra Permana', 2913),
('2022003034', 'DHANIKA DEVY  SEPTIANA', 2914),
('2022003037', 'Dadie Dwimulia Afriadi', 2915),
('2024003575', 'Nabila Savitri', 2916),
('2024003468', 'Mansur SE.MM', 2917),
('2024003629', 'Indah Fitriyana', 2918),
('2022003066', 'Ayu Dwi Septiani', 2919),
('2022003033', 'Mahmudah', 2920),
('2024003626', 'Hanna Fransiska', 2921),
('2022003046', 'Maulida Shabrina', 2922),
('2022003092', 'Elfira', 2923),
('2022003051', 'ASTRID KUSUMA DEWI', 2924),
('2022003039', 'Zaenal Abidin', 2925),
('2022003108', 'FRANSISCA WIRYASAPUTRA', 2926),
('2022003068', 'Mega Christina', 2927),
('2023003342', 'Emir Khairy', 2928),
('2022003129', 'Rizky Amalia', 2929),
('2022003044', 'ILMAN MUFID DWIYONO', 2930),
('2024003428', 'Amy Roslia', 2931),
('2022003101', 'Kun Listyaningsih', 2932),
('2023003152', 'Rizki Ramadhan', 2933),
('2024003430', 'Andi Kurniawan', 2934),
('2024003420', 'Ibo Narendra Bhirawa', 2935),
('2023003222', 'Kevin William', 2936),
('2023003254', 'Galuh Candra Kirana, ST', 2937),
('2025003762', 'Kevin Pratama Jeffrey', 2938),
('2022003080', 'Tazkia Maulida Poetri', 2939),
('2025003779', 'Andreas Gunawan', 2940),
('2022003140', 'Muhammad Iqbal Al Ghiffari', 2941),
('2024003409', 'Gregorius Gary', 2942),
('2024003560', 'Puspita Dewi', 2943),
('2025003738', 'WIWIT HERMASYAH', 2944),
('2022003133', 'William', 2945),
('2022003124', 'Hary Haryono', 2946),
('2022003067', 'FEBRI ANGGARA PUTRA', 2947),
('2022003069', 'Yuke Irawati', 2948),
('2022003071', 'Fastabiqul Khairat Silitonga', 2949),
('2023003358', 'Edy Sutriono, SE,MM,MSE,CSA,CFIA', 2950),
('2022003077', 'Sabrina Dyah Nayabarani', 2951),
('2022003139', 'Ednita Androgini Titisgati', 2952),
('2022003094', 'Theresia Marlina', 2953),
('2023003340', 'NICHOLAS DAVID HILMAN', 2954),
('2025003657', 'Septian Odie Saputra', 2955),
('2025003658', 'Muhammad Ariq Aswata', 2956),
('2022003078', 'Putranto Prasetyo', 2957),
('2022003075', 'Aldirano Satrio Akbar', 2958),
('2022003079', 'Yudistira Hanid Dian Prasetya', 2959),
('2022003083', 'Fransiskus Xaverius Christian', 2960),
('2024003472', 'Ryanti Widya Savitri, ST.,MT', 2961),
('2022003110', 'Mariah', 2962),
('2022003096', 'LIANY FRANSISCA NATANAEL', 2963),
('2023003339', 'Anissa Indriastuti', 2964),
('2022003084', 'Tiara Anggelina Doko', 2965),
('2024003411', 'A. Muhammad Farhan', 2966),
('2022003090', 'Fahrurozi', 2967),
('2025003692', 'Ayu Lintang Cempoko', 2968),
('2023003183', 'I Made Adi Saputra', 2969),
('2022003089', 'Dedi Utomo', 2970),
('2023003171', 'Riry Nelza Feranty', 2971),
('2025003654', 'ADITIA RAHADIYANSYAH BAGUS PRASETIO UTOMO', 2972),
('2025003665', 'Jaya Pratama', 2973),
('2023003212', 'Fadi Jatama Fuad', 2974),
('2022003095', 'Fransisca Widjaja', 2975),
('2024003412', 'Ira Puji Rahayu', 2976),
('2025003685', 'Devi Susiliawati', 2977),
('2023003249', 'Kelvin Brema Sembiring', 2978),
('2025003637', 'Hans Kristian Tantio', 2979),
('2025003661', 'Hindria Listyadi, SPT. MM', 2980),
('2022003104', 'Hery Mulyawan', 2981),
('2023003261', 'Fazri Zaelani', 2982),
('2023003333', 'Dimas Satria Hardianto', 2983),
('2022003121', 'Nova Andriani', 2984),
('2022003111', 'Selvi Ocktaviani', 2985),
('2022003116', 'Rina Ardia Kusumawati', 2986),
('2023003163', 'Fauji Ari', 2987),
('2024003526', 'Edwin Julianus Sebayang, SE.MM', 2988),
('2023003315', 'Rafi Aulia Adipradana', 2989),
('2022003131', 'Edo Ardiansyah', 2990),
('2022003113', 'Sonni Cipta Pratama', 2991),
('2023003244', 'Alfiqri Mawaddah Adi Nugraha', 2992),
('2022003125', 'RATNA IKAWATI', 2993),
('2023003314', 'Dwi Saputri', 2994),
('2023003351', 'Alit Novia Dewi', 2995),
('2024003559', 'Girindra Wardhana', 2996),
('2024003585', 'Yahman Faoji', 2997),
('2024003532', 'Jason Nicholas Kentjana', 2998),
('2022003137', 'Ramlan Pangaribuan', 2999),
('2022003128', 'Yanu Suwandika Menoadji', 3000),
('2024003540', 'Stefanus Adrian C.W', 3001),
('2022003119', 'Khairul Amri Dalimunthe', 3002),
('2023003223', 'Yuli Novita Sari Putri, S.PSI', 3003),
('2024003590', 'ANNAFRID MP NIKIJULUW', 3004),
('2023003202', 'Nani Indah Nurwati', 3005),
('2022003138', 'Adhi Rachmat Tahir', 3006),
('2023003256', 'Adi Putra Setianto', 3007),
('2022003123', 'SRIWIDJAJA', 3008),
('2022003148', 'James Sebastian Nugroho', 3009),
('2025003697', 'Fakhrul Ardiyan', 3010)
ON CONFLICT (member_number) DO NOTHING;
