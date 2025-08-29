# Türkçe Metin İşleyici - WebGPU Hızlandırmalı

Modern web teknolojileri kullanarak Türkçe metin işleme ve normalizasyon işlemlerini GPU üzerinde hızlandıran gelişmiş bir araç.

![WebGPU](https://img.shields.io/badge/WebGPU-Experimental-orange)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow)
![License](https://img.shields.io/badge/License-MIT-green)

## Özellikler

- **GPU Hızlandırmalı İşleme**: WebGPU API kullanarak paralel metin işleme
- **Türkçe Karakter Desteği**: Ç, Ğ, I, İ, Ö, Ş, Ü karakterlerinin doğru tanınması
- **Gerçek Zamanlı Analiz**: Karakter türlerine göre detaylı istatistikler
- **Yüksek Performans**: CPU'ya göre çok daha hızlı işleme hızları

## Kullanım Alanları

- **Metin Ön İşleme**: NLP projeleri için Türkçe metin normalizasyonu
- **Karakter Analizi**: Türkçe karakterlerin tespiti ve sayımı
- **Performans Testleri**: GPU vs CPU karşılaştırmaları
- **WebGPU Geliştirme**: Modern web grafik programlama örnekleri

## Hızlı Başlangıç

### Gereksinimler

- Modern bir web tarayıcısı (Chrome 113+, Firefox 113+, Safari 16.4+)
- WebGPU desteği etkin olmalı
- Yerel web sunucusu (CORS politikaları nedeniyle)

### Kurulum

1. **Projeyi klonlayın**
```bash
git clone https://github.com/toprakdeviren/turkish-text-processor.git
cd turkish-text-processor
```

2. **Yerel sunucu başlatın**
```bash
# Python ile
python -m http.server 8000

# Node.js ile
npx serve .


3. **Tarayıcıda açın**
```
http://localhost:8000
```

## Özellik Detayları

### GPU İşleme Kapasitesi

- **Karakter Türü Analizi**: ASCII, Türkçe, UTF-8 karakterlerin tespiti
- **Performans Metrikleri**: İşleme süresi ve throughput hesaplaması
- **Paralel İşleme**: WebGPU compute shader'ları ile eşzamanlı işlem

### Türkçe Karakter Desteği

```
Türkçe Harfler: ç, ğ, ı, ö, ş, ü, Ç, Ğ, İ, Ö, Ş, Ü
ASCII Karakterler: a-z, A-Z, 0-9, özel karakterler
UTF-8 Karakterler: emoji, özel semboller
```

## Teknik Detaylar

### WebGPU Compute Shader

Proje, özel geliştirilmiş WGSL compute shader'ı kullanarak:
- UTF-8 byte dizilerini paralel işler
- Türkçe karakterleri doğru şekilde tanır
- Kelime sınırlarını tespit eder
- İstatistiksel verileri hesaplar

### Performans Optimizasyonları

- **Workgroup Paralelleştirme**: 256 thread'lik workgroup'lar
- **Verimli Buffer Yönetimi**: Minimal bellek kullanımı
- **Asenkron İşleme**: UI bloklamadan GPU işlemleri


## İletişim

- **GitHub**: [@toprakdeviren](https://github.com/toprakdeviren)
- **Email**: ugur@toprak.run
- **Proje Linki**: [https://github.com/toprakdeviren/turkish-text-processor](https://github.com/toprakdeviren/turkish-text-processor)