// Şifre analizi. Tamamen tarayıcıda çalışır; hiçbir veri bir yere gönderilmez.
// Basit bir "saldırgan ne kadar sürede tahmin eder" modeli: şifre parçalara ayrılır
// (yaygın şifre, kelime, yıl, sıra, tekrar), her parçanın tahmin maliyeti bit olarak toplanır.
(function (root) {
  'use strict';

  // Güçlü bir bilgisayarın saniyede deneyebileceği şifre sayısı (sayfadaki sayaçla aynı).
  var GUESSES_PER_SECOND = 1e10;
  var LEVELS = ['Çok zayıf', 'Zayıf', 'Orta', 'Güçlü', 'Çok güçlü'];

  var TR_MAP = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u' };
  var LEET = { '@': 'a', '4': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o', '$': 's', '5': 's', '7': 't', '+': 't' };

  function baseChar(c) {
    var l = c.toLocaleLowerCase('tr');
    l = TR_MAP[l] || l;
    return l.length === 1 ? l : '\u0001'; // tek kod birimi değilse yer tutucu: indeksler kaymasın
  }
  function norm(s) { return Array.from(s).map(baseChar).join(''); }

  var COMMON = new Set((
    '123456 123456789 12345678 12345 1234567 1234567890 111111 000000 123123 654321 666666 121212 ' +
    '112233 159753 147258 147258369 987654321 12341234 11111111 00000000 1234 0000 1111 2580 ' +
    '1q2w3e4r 1q2w3e qwer1234 1234qwer qwerty qwerty123 qwertyuiop asdfgh asdasd asdf zxcvbnm qazwsx azerty ' +
    'password password1 iloveyou admin welcome monkey dragon football letmein abc123 a123456 superman batman ' +
    'sunshine princess freedom shadow master hello test test123 aaaaaa pokemon minecraft roblox fortnite ' +
    'sifre sifre123 sifrem parola parola123 gizli deneme merhaba kullanici seniseviyorum askim sevgilim ' +
    'galatasaray fenerbahce besiktas trabzonspor cimbom fener bjk gs 1905 1907 1903 1967 ' +
    'istanbul ankara izmir turkiye turkey'
  ).split(' ').map(norm));

  var WORDS = new Set((
    // isimler
    'ali ayse fatma emine hatice zeynep elif meryem zehra esra merve ebru seda selin irem buse ceren cansu ' +
    'gamze ecrin asel defne miray eylul nehir azra hira alya mira lina ada ela duru ipek melis beren aylin ' +
    'ozge tugba kubra sena rabia sude nisa yagmur damla gizem ozlem sibel derya mehmet ahmet mustafa huseyin ' +
    'hasan ibrahim ismail yusuf omer emir eymen mert berat kerem arda efe can cem deniz murat burak emre hakan ' +
    'kemal berk baris bora kaan onur tuna umut yigit poyraz aras ozan sinan serkan tolga volkan oguz kaya ' +
    'ayaz alp alparslan metehan batuhan furkan enes eren emirhan yasin salih halil ramazan recep osman ' +
    // aile
    'anne annem baba babam abla abi kardes kardesim dede nine babaanne anneanne teyze amca dayi hala aile ailem ' +
    // hayvanlar ve evcil hayvan adları
    'kedi kedim kopek kopegim kus balik aslan kaplan kartal ayi kurt tilki tavsan fil zurafa panda maymun ' +
    'penguen yunus balina inek koyun tavuk civciv kelebek ari kirpi sincap kaplumbaga dinozor ejderha unicorn ' +
    'pamuk minnos tekir boncuk karabas zeytin findik pasa duman mia leo max luna bella cookie ' +
    // okul ve eşyalar
    'okul ogretmen sinif ders kitap kalem silgi defter canta oyun oyuncak top futbol basketbol voleybol araba ' +
    'bisiklet kaykay ucak gemi tren roket evim bahce cicek agac gunes yildiz gokyuzu dunya uzay gezegen robot ' +
    'telefon bilgisayar tablet internet muzik gitar piyano keman resim dans ' +
    // renkler
    'mavi kirmizi sari yesil mor pembe turuncu siyah beyaz gri kahverengi lacivert ' +
    // yiyecekler
    'elma armut muz cilek kiraz karpuz kavun portakal limon pizza hamburger cikolata dondurma pasta kek seker ' +
    'sut ekmek peynir makarna lahmacun doner kebap borek simit cay kahve kola ' +
    // zaman
    'sabah aksam gece gun hafta yaz kis bahar sonbahar ocak subat mart nisan mayis haziran temmuz agustos ' +
    'ekim kasim aralik pazartesi sali carsamba persembe cuma cumartesi pazar ' +
    // sık kelimeler
    'sevgi ask canim tatlim tatli melek prenses kral kralice kahraman mutlu guzel super harika sevimli benim ' +
    'senin her hayat ruya mucize sihir evet hayir tamam selam ' +
    // İngilizce
    'love cat dog king queen star angel baby sun moon blue red green black white magic ninja killer hero boss ' +
    'pro game gamer player happy lucky cool sweet summer winter flower soccer music apple orange banana chocolate ' +
    // marka, oyun, ünlü, şehir
    'youtube instagram tiktok whatsapp google samsung iphone pubg valorant brawl brawlstars pikachu mario sonic ' +
    'barbie elsa spiderman ronaldo messi neymar icardi osimhen mbappe haaland bursa antalya konya adana trabzon ' +
    'samsun kayseri eskisehir mersin gaziantep diyarbakir kocaeli sakarya malatya erzurum rize'
  ).split(' ').map(norm));

  var KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890', 'qwertyuiopgu', 'asdfghjklsi', 'zxcvbnmoc'];
  KEYBOARD_ROWS = KEYBOARD_ROWS.concat(KEYBOARD_ROWS.map(function (r) { return r.split('').reverse().join(''); }));

  function upperBits(chars) {
    var u = chars.filter(function (c) { return c !== c.toLocaleLowerCase('tr'); }).length;
    if (!u) return 0;
    var firstOnly = u === 1 && chars[0] !== chars[0].toLocaleLowerCase('tr');
    return firstOnly || u === chars.length ? 1 : u;
  }

  function analyze(pw) {
    var chars = Array.from(pw || '');
    var n = chars.length;
    if (!n) return null;

    var has = {
      lower: /[a-zçğıöşü]/.test(pw),
      upper: /[A-ZÇĞİÖŞÜ]/.test(pw),
      digit: /[0-9]/.test(pw),
      symbol: /[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ]/.test(pw)
    };
    var pool = (has.lower ? 29 : 0) + (has.upper ? 29 : 0) + (has.digit ? 10 : 0) + (has.symbol ? 33 : 0);
    var perChar = Math.log2(pool);

    var base = chars.map(baseChar);
    var baseStr = base.join('');
    var leetStr = base.map(function (c) { return LEET[c] || c; }).join('');

    var matches = [];
    function add(i, j, cost, type) { matches.push({ i: i, j: j, cost: cost, type: type }); }
    function findAll(hay, needle, cb) {
      for (var k = hay.indexOf(needle); k !== -1; k = hay.indexOf(needle, k + 1)) cb(k, k + needle.length);
    }

    // Kelimeler ve yaygın şifreler (hem düz hem de @→a gibi değişiklikler geri alınmış hâliyle)
    [[COMMON, 8, 'common'], [WORDS, 11, 'word']].forEach(function (d) {
      d[0].forEach(function (w) {
        if (w.length < 3) return;
        [baseStr, leetStr].forEach(function (hay) {
          findAll(hay, w, function (i, j) {
            var leet = baseStr.slice(i, j) !== leetStr.slice(i, j);
            add(i, j, d[1] + upperBits(chars.slice(i, j)) + (leet ? 1 : 0), d[2]);
          });
        });
      });
    });

    var m, re;
    // Yıllar: 1900–2099 arası ~200 olasılık
    re = /(19|20)\d\d/g;
    while ((m = re.exec(baseStr))) add(m.index, m.index + 4, Math.log2(200), 'year');

    // Tekrarlar: aaa, 111, abcabc
    re = /(.)\1{2,}/g;
    while ((m = re.exec(baseStr))) add(m.index, m.index + m[0].length, perChar + Math.log2(m[0].length), 'repeat');
    re = /(.{2,}?)\1+/g;
    while ((m = re.exec(baseStr))) {
      add(m.index, m.index + m[0].length, m[1].length * perChar + Math.log2(m[0].length / m[1].length), 'repeat');
    }

    // Alfabe ya da rakam sırası: abc, 123, 987
    function cls(c) { return /[a-z]/.test(c) ? 1 : /[0-9]/.test(c) ? 2 : 0; }
    for (var i = 0; i < n - 2; i++) {
      var d = baseStr.charCodeAt(i + 1) - baseStr.charCodeAt(i);
      if ((d !== 1 && d !== -1) || !cls(baseStr[i]) || cls(baseStr[i]) !== cls(baseStr[i + 1])) continue;
      var j = i + 1;
      while (j + 1 < n && baseStr.charCodeAt(j + 1) - baseStr.charCodeAt(j) === d && cls(baseStr[j + 1]) === cls(baseStr[i])) j++;
      if (j - i + 1 >= 3) { add(i, j + 1, 3 + Math.log2(j - i + 1), 'sequence'); i = j - 1; }
    }
    // Klavye sırası: qwerty, asdf
    KEYBOARD_ROWS.forEach(function (row) {
      for (var len = 4; len <= row.length; len++) {
        for (var s = 0; s + len <= row.length; s++) {
          findAll(baseStr, row.substr(s, len), function (a, b) { add(a, b, 4 + Math.log2(len), 'sequence'); });
        }
      }
    });

    // En ucuz parçalama (saldırgan için en kolay yol)
    var best = [0], pick = [null], byEnd = [];
    for (var e = 0; e <= n; e++) byEnd.push([]);
    matches.forEach(function (mt) { byEnd[mt.j].push(mt); });
    for (var p = 1; p <= n; p++) {
      best[p] = best[p - 1] + perChar;
      pick[p] = null;
      byEnd[p].forEach(function (mt) {
        if (best[mt.i] + mt.cost < best[p]) { best[p] = best[mt.i] + mt.cost; pick[p] = mt; }
      });
    }
    var used = [];
    for (var q = n; q > 0;) {
      if (pick[q]) { used.unshift(pick[q]); q = pick[q].i; } else q--;
    }

    var common = COMMON.has(baseStr) || COMMON.has(leetStr);
    var bits = common ? Math.min(best[n], 8) : best[n];
    var level = bits < 28 ? 0 : bits < 36 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4;
    var text = function (mt) { return chars.slice(mt.i, mt.j).join(''); };
    var of = function (types) {
      return used.filter(function (mt) { return types.indexOf(mt.type) !== -1; }).map(text);
    };

    var r = {
      length: n,
      has: has,
      bits: bits,
      seconds: Math.pow(2, bits - 1) / GUESSES_PER_SECOND, // ortalama: olasılıkların yarısı denenince bulunur
      level: level,
      common: common,
      words: of(['word', 'common']).filter(function (t) { return /\D/.test(t); }),
      years: of(['year']),
      sequences: of(['sequence']),
      repeats: of(['repeat']),
      leet: used.some(function (mt) {
        return (mt.type === 'word' || mt.type === 'common') && baseStr.slice(mt.i, mt.j) !== leetStr.slice(mt.i, mt.j);
      })
    };
    var strong = level >= 3;
    r.checks = {
      length: n >= 12,
      lower: has.lower,
      upper: has.upper,
      digit: has.digit,
      symbol: has.symbol,
      notCommon: !common && (strong || !used.some(function (mt) { return mt.type === 'common'; })),
      noPersonal: strong || (!r.words.length && !r.years.length),
      noPattern: !r.sequences.length && !r.repeats.length
    };
    return r;
  }

  function quote(list) { return '"' + list.join('", "') + '"'; }

  function tips(r) {
    var t = [];
    var kinds = ['lower', 'upper', 'digit', 'symbol'].filter(function (k) { return r.has[k]; }).length;
    if (r.common) t.push('Bu, en çok kullanılan şifrelerden biri. Saldırganlar ilk önce bunları dener!');
    if (r.length < 12) t.push('Daha uzun yap: en az 12 karakter. Her yeni karakter şifreni katlayarak güçlendirir.');
    if (r.level < 3 && r.words.length) {
      t.push(quote(r.words) + ' kolay tahmin edilir. İsim, takım ya da hayvan adı yerine birbiriyle ilgisiz kelimeler seç.');
    }
    if (r.level < 3 && r.years.length) {
      t.push(quote(r.years) + ' bir yıla benziyor. Doğum yılı gibi tarihler kolay tahmin edilir.');
    }
    if (r.sequences.length) t.push(quote(r.sequences) + ' sıralı karakterler. abc, 123, qwerty gibi diziler hemen denenir.');
    if (r.repeats.length) t.push(quote(r.repeats) + ' tekrar ediyor. Aynı şeyi tekrarlamak şifreyi güçlendirmez.');
    if (r.leet) t.push('a yerine @, o yerine 0 yazmak bilinen bir numara. Şifre kırma programları bunu da dener.');
    if (r.level < 3 && kinds < 3) t.push('Büyük harf, rakam ya da sembol ekleyerek çeşitlendir.');
    if (r.level >= 3) t.push('Harika! Bu şifreyi yalnızca tek bir hesapta kullan ve kimseyle paylaşma.');
    else if (!t.length) t.push('Biraz daha uzatırsan şifren çok daha güçlü olur.');
    return t;
  }

  var YEAR = 31536000;

  function formatTime(s) {
    if (s < 1) return 'bir saniyeden az';
    var y = s / YEAR;
    if (y >= 1e12) return 'trilyonlarca yıl';
    if (y >= 1e9) return 'milyarlarca yıl';
    if (y >= 1) {
      var step = Math.pow(10, Math.max(0, Math.floor(Math.log10(y)) - 1)); // 2 anlamlı basamak: 763.421 → 760.000
      return (Math.floor(y / step) * step).toLocaleString('tr-TR') + ' yıl';
    }
    var units = [['ay', 2592000], ['gün', 86400], ['saat', 3600], ['dakika', 60], ['saniye', 1]];
    for (var i = 0; i < units.length; i++) {
      if (s >= units[i][1]) return Math.floor(s / units[i][1]) + ' ' + units[i][0];
    }
  }

  function compare(s) {
    if (s < 1) return 'Göz açıp kapayıncaya kadar!';
    if (s < 600) return 'Bir teneffüsten bile kısa.';
    if (s < 86400) return 'Bir okul gününden kısa.';
    if (s < YEAR) return 'Bir okul yılından kısa.';
    if (s < 100 * YEAR) return 'Bir insan ömrü kadar.';
    if (s < 4500 * YEAR) return 'Yüzyıllar sürer.';
    if (s < 4.5e9 * YEAR) return 'Piramitlerin yaşından bile uzun!';
    return 'Dünya’nın yaşından bile uzun!';
  }

  var api = { analyze: analyze, tips: tips, formatTime: formatTime, compare: compare, LEVELS: LEVELS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SifreAnaliz = api;
})(this);
