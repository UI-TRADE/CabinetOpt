import csv
import chardet

from io import StringIO


def read_csv_inmemory(csv_file):
    file_data = csv_file.read()
    detected_encoding = chardet.detect(file_data)
    encoding = detected_encoding['encoding']
    decoded_data = file_data.decode(encoding)
    utf8_file = StringIO(decoded_data)
    return csv.reader(utf8_file)
