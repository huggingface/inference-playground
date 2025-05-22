#!/bin/bash

sudo ln /usr/lib/libpcre.so.1 /usr/lib/libpcre.so.3

git clone https://github.com/festvox/flite.git
cd flite
./configure --enable-shared
make
make get_voices

sudo cp build/x86_64-linux-gnu/lib/libflite.so.1 /usr/lib
sudo cp build/x86_64-linux-gnu/lib/libflite_cmu_grapheme_lang.so.1 /usr/lib
sudo cp build/x86_64-linux-gnu/lib/libflite_cmu_grapheme_lex.so.1 /usr/lib
sudo cp build/x86_64-linux-gnu/lib/libflite_cmu_indic_lang.so.1 /usr/lib
sudo cp build/x86_64-linux-gnu/lib/libflite_cmu_indic_lex.so.1 /usr/lib
sudo cp build/x86_64-linux-gnu/lib/libflite_cmu_time_awb.so.1 /usr/lib
sudo cp build/x86_64-linux-gnu/lib/libflite_cmu_us_awb.so.1 /usr/lib
sudo cp build/x86_64-linux-gnu/lib/libflite_cmu_us_kal.so.1 /usr/lib
sudo cp build/x86_64-linux-gnu/lib/libflite_cmu_us_kal16.so.1 /usr/lib
sudo cp build/x86_64-linux-gnu/lib/libflite_cmu_us_rms.so.1 /usr/lib
sudo cp build/x86_64-linux-gnu/lib/libflite_cmu_us_slt.so.1 /usr/lib
sudo cp build/x86_64-linux-gnu/lib/libflite_cmulex.so.1 /usr/lib
sudo cp build/x86_64-linux-gnu/lib/libflite_usenglish.so.1 /usr/lib
