import * as fs from 'fs';
import { ALL_WORDS } from '../lib/word-bank';

// Read the pasted content and extract words
const raw = fs.readFileSync('/home/ubuntu/upload/pasted_content.txt', 'utf-8');
const matches = raw.match(/"([^"]+)"/g);
const newWords = matches ? matches.map(m => m.replace(/"/g, '').trim()).filter(w => w.length > 0) : [];

const existing = new Set(ALL_WORDS.map(w => w.toLowerCase()));
const unique = [...new Set(newWords.filter(w => !existing.has(w.toLowerCase())))];

// Categorize the unique words
const categories: Record<string, string[]> = {
  DARK_WORDS: [], // Paranormal, korku, mistik kavramlar
  PARANORMAL_TERMS: [], // Teknik paranormal terimler
  PLACE_WORDS: [], // Mekanlar, mimari
  OBJECT_WORDS: [], // Nesneler, objeler
  TIME_WORDS: [], // Zaman dilimleri, gökyüzü
  NATURE_WORDS: [], // Doğa elementleri
  ACTION_WORDS: [], // Eylemler
  ADJECTIVE_WORDS: [], // Sıfatlar
  MANIPULATIVE_RESPONSES: [], // Hitaplar, sorular, konumlar
  SOUND_WORDS: [], // Ses terimleri
};

// Section 1: Mistik, Kadim (lines 1-12 in original)
const mistik = ["izbe","metruk","heyula","zifiri","muamma","tılsımat","ebced","remil",
  "serzeniş","izhar","nihayet","ibret","vasiyet","intikal","zulmet","nifak","ihata","itilaf",
  "inziva","hazin","büyülü","esrarlı","fanilik","idrak","vurgun","hezeyan","sayıklama","gaflet",
  "delalet","zahiri","batıni","sirayet","sirayet-eden","akıbetiniz","mukadderat",
  "alın-yazısı","çile","figan","sayha","yankılanma","sedalar","gaipten-sesler","aksiseda",
  "aksetme","akis","gölgeleşme","yanılsama","karaltı","karanlık-silüet","beyaz-gölge",
  "puslu-görüntü","kozmos","boyutsal","zamansal","mekansal","evrensel"];
mistik.forEach(w => { if (unique.includes(w)) categories.DARK_WORDS.push(w); });

// Section 2: Paranormal Anomaliler ve Teknik (lines 14-24)
const teknik = ["Manyetik-alan","dalgalanma","statik-gürültü","beyaz-gürültü","pembe-gürültü",
  "frekans-kesilmesi","sinyal-kaybı","veri-akışı","distorsiyon","enerji-patlaması","iyonizasyon",
  "termal-düşüş","aniden-soğuma","salınım","elektromanyetik","radyasyon","dalga-boyu",
  "tarama-hızı","kanal-atlama","ters-ses","ayna-etkisi","yankı-odası","ses-duvarı","baskılama",
  "filtreleme","izole","yalıtımlı","korumalı","mühürlü-alan","karantina","bulaşma","etkileşim",
  "tetiklenme","aktivasyon","otomatik-kayıt","grafik-pik","frekans-piki","algılayıcı","tarayıcı",
  "izleme-paneli","küresel-veri","lokasyon","koordinat","rakım","basınç","atmosferik","nem-oranı",
  "is-kokusu","kükürt","ozon","yanık-kokusu","rutubet","rüzgar-koridoru","hava-akımı","cereyan",
  "statik-yük","şarj","deşarj","pil-tüketimi","enerji-emilmesi","voltaj","akım","direnç",
  "kondansatör","bobin","röle","devre-kesici","kısa-devre","topraklama","yalıtkan","iletken",
  "yarı-iletken","kuvars","mercek","odaklama","yansıtıcı","kırılma","ışık-kırılması","spektrum"];
teknik.forEach(w => { if (unique.includes(w)) categories.PARANORMAL_TERMS.push(w); });

// Section 3: Mekanlar, Objeler (lines 26-36)
const mekanlar = ["tavan-arası","labirent","gizli-oda","baca","şömine","merdiven-altı","giriş-katı",
  "sığınak","kemerli-duvar","sütun","payanda","kiriş","kripta","katakomb","anıt","boy-aynası"];
mekanlar.forEach(w => { if (unique.includes(w)) categories.PLACE_WORDS.push(w); });

const objeler = ["gıcirti","kapı-kolu","kilit-dili","anahtar-deliği","paslı-zincir","asma-kilit",
  "mezar-taşı","büst","eski-fotoğraf","tuval","fresk","duvar-kağıdı","yırtık","kırık-cam",
  "pencere-perdesi","tül","dantel","çeyiz-sandığı","eski-oyuncak","porselen-bebek","beşik",
  "sallanan-sandalye","saat-sarkacı","duvar-saati","köstekli-saat","kronometre","kum-saati",
  "gaz-lambası","şamdan","kurum","is","toz-bulutu","örümcek-ağı","saç-teli","giysi","pelerin",
  "kan-izi","rutubet-lekesi","koku","küf-kokusu","antik-kitap","elyazması","parşömen",
  "deri-kaplama","mürekkep","hokka","kalem","zarf","mühür-mumu","damga","arma","madalyon"];
objeler.forEach(w => { if (unique.includes(w)) categories.OBJECT_WORDS.push(w); });

// Section 4: Doğa, Gökyüzü, Zaman (lines 38-48)
const zaman = ["şafak-vakti","gündönümü","ay-tutulması","güneş-tutulması","hilal","karanlık-ay",
  "kanlı-ay","yıldız-kayması","samanyolu","takımyıldız","kutup-yıldızı","şimal","cenup","şark",
  "garp","kerteriz","ufuk-çizgisi"];
zaman.forEach(w => { if (unique.includes(w)) categories.TIME_WORDS.push(w); });

const doga = ["sis-bulutu","buhar","yoğuşma","saçak","ışık-patlaması","yel","keşişleme",
  "toprak-kayması","sarsıntı","fay-hattı","yarık","dikit","sarkıt","obruk","krater","lav","magma",
  "yer-altı-suyu","kaynak-suyu","şifalı-su","büyülü-pınar","sazlık","gölet","akarsu","dere-yatağı",
  "deniz-köpüğü","gelgit","akar","sızıntı","damla","ter","plazma","özsu","reçine","kehribar",
  "fosil","kayaç","mineral","maden","cevher"];
doga.forEach(w => { if (unique.includes(w)) categories.NATURE_WORDS.push(w); });

// Section 5: Eylemler, Hitaplar (lines 50-60)
const eylemler = ["takip-et","getir","götür","kurtar","yardım-et","bırak","tut","yakala","bırakma",
  "unutup-gitme","söyle","haykır","konuşma","ört","kapa","mühürle","çöz","bağla","kopar","parlat","karart"];
eylemler.forEach(w => { if (unique.includes(w)) categories.ACTION_WORDS.push(w); });

const hitaplar = ["gömdüm","çıkardım","kaybettim","buldum","arıyorum","geliyorum","gidiyorum",
  "kaldım","öldüm","yaşıyorum","yakında","tam-arkanda","sağında","solunda","üstünde","arasında",
  "içinde","ötesinde","beri-yakada","karşıda","sınırda","kimsin","ismin-ne","ne-istiyorsun",
  "neden-buradasın","kaç-kişisiniz","ne-zaman-geldin","nasıl-öldün","bizi-duyuyor-musun",
  "yardım-istiyor-musun","gitmeli-miyiz"];
hitaplar.forEach(w => { if (unique.includes(w)) categories.MANIPULATIVE_RESPONSES.push(w); });

// Print summary
let total = 0;
for (const [cat, words] of Object.entries(categories)) {
  if (words.length > 0) {
    console.log(`${cat}: ${words.length} kelime`);
    total += words.length;
  }
}
console.log(`\nToplam kategorize: ${total} / ${unique.length} benzersiz`);

// Write categorized output for manual integration
fs.writeFileSync('/home/ubuntu/paranormal-hunter/scripts/pack5-categorized.json', JSON.stringify(categories, null, 2));
console.log("Kategorize edilmiş kelimeler pack5-categorized.json'a yazıldı");
